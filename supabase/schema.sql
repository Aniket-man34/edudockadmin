-- ============================================================================
-- EduDock canonical content schema (idempotent rebuild)
-- ----------------------------------------------------------------------------
-- Safe to run repeatedly on the live database. Uses IF NOT EXISTS / DROP POLICY
-- IF EXISTS so it defines the schema authoritatively WITHOUT dropping tables or
-- destroying existing rows. Covers: categories, updates, tools, pdfs +
-- relational mapping, indexes, SEO columns, RLS, public-read / admin-write
-- policies, updated_at triggers.
-- ============================================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── updated_at trigger function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- CATEGORIES (parent of updates / tools / pdfs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar NOT NULL,
  entity_type varchar NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Scope each category to one content type.
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_entity_type_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_entity_type_check
  CHECK (entity_type::text = ANY (ARRAY['pdf','update','tool']::text[]));

CREATE INDEX IF NOT EXISTS idx_categories_entity_type
  ON public.categories (entity_type);

-- ============================================================================
-- UPDATES (news / articles → Article schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        varchar NOT NULL,
  content      text,
  image_url    text,
  external_url text,
  slug         text UNIQUE,
  author_name  varchar,
  author_avatar text,
  clicks       integer DEFAULT 0,
  category_id  uuid,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  -- SEO
  meta_title       varchar,
  meta_description text,
  schema_markup    jsonb
);

-- ============================================================================
-- TOOLS (external tools → WebApplication schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tools (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             varchar NOT NULL,
  short_description text,
  description       text,
  url               text NOT NULL,
  image_url         text,
  image_type        varchar DEFAULT 'upload',
  favicon_url       text,
  author_name       varchar,
  author_avatar     text,
  clicks            integer DEFAULT 0,
  category_id       uuid,
  slug              text UNIQUE,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  -- SEO
  meta_title       varchar,
  meta_description text,
  schema_markup    jsonb
);

ALTER TABLE public.tools DROP CONSTRAINT IF EXISTS tools_image_type_check;
ALTER TABLE public.tools
  ADD CONSTRAINT tools_image_type_check
  CHECK (image_type::text = ANY (ARRAY['upload','favicon']::text[]));

-- ============================================================================
-- PDFS (study material → DigitalDocument schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pdfs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           varchar NOT NULL,
  description     text,
  file_url        text,
  cover_image_url text,
  file_type       varchar DEFAULT 'upload',
  drive_link      text,
  slug            text UNIQUE,
  author_name     varchar,
  author_avatar   text,
  clicks          integer DEFAULT 0,
  category_id     uuid,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  -- SEO
  meta_title       varchar,
  meta_description text,
  schema_markup    jsonb
);

ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_file_type_check;
ALTER TABLE public.pdfs
  ADD CONSTRAINT pdfs_file_type_check
  CHECK (file_type::text = ANY (ARRAY['upload','drive']::text[]));

-- ── Backfill SEO columns on any pre-existing tables (no-op if already present)
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS meta_title varchar;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS schema_markup jsonb;
ALTER TABLE public.tools   ADD COLUMN IF NOT EXISTS meta_title varchar;
ALTER TABLE public.tools   ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.tools   ADD COLUMN IF NOT EXISTS schema_markup jsonb;
ALTER TABLE public.pdfs    ADD COLUMN IF NOT EXISTS meta_title varchar;
ALTER TABLE public.pdfs    ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.pdfs    ADD COLUMN IF NOT EXISTS schema_markup jsonb;

-- ============================================================================
-- RELATIONAL MAPPING (FKs → categories). ON DELETE SET NULL keeps content alive
-- when a category is removed.
-- ============================================================================
ALTER TABLE public.updates DROP CONSTRAINT IF EXISTS updates_category_id_fkey;
ALTER TABLE public.updates
  ADD CONSTRAINT updates_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.tools DROP CONSTRAINT IF EXISTS tools_category_id_fkey;
ALTER TABLE public.tools
  ADD CONSTRAINT tools_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.pdfs DROP CONSTRAINT IF EXISTS pdfs_category_id_fkey;
ALTER TABLE public.pdfs
  ADD CONSTRAINT pdfs_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES — slug lookups (detail pages), category filters, recency & popularity
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_updates_slug        ON public.updates (slug);
CREATE INDEX IF NOT EXISTS idx_updates_category_id  ON public.updates (category_id);
CREATE INDEX IF NOT EXISTS idx_updates_created_at   ON public.updates (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_clicks_desc  ON public.updates (clicks DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tools_slug        ON public.tools (slug);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON public.tools (category_id);
CREATE INDEX IF NOT EXISTS idx_tools_created_at  ON public.tools (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tools_clicks_desc ON public.tools (clicks DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_pdfs_slug        ON public.pdfs (slug);
CREATE INDEX IF NOT EXISTS idx_pdfs_category_id ON public.pdfs (category_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_at  ON public.pdfs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdfs_clicks_desc ON public.pdfs (clicks DESC NULLS LAST);

-- ============================================================================
-- updated_at TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS set_updates_updated_at ON public.updates;
CREATE TRIGGER set_updates_updated_at BEFORE UPDATE ON public.updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tools_updated_at ON public.tools;
CREATE TRIGGER set_tools_updated_at BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_pdfs_updated_at ON public.pdfs;
CREATE TRIGGER set_pdfs_updated_at BEFORE UPDATE ON public.pdfs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Public (anon) may READ; only authenticated admins may write. Policies are
-- dropped+recreated so re-runs converge to exactly this set.
-- ============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfs       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','updates','tools','pdfs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_insert_'  || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_update_'  || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_delete_'  || t, t);
    -- Legacy policy names from earlier migrations — remove so we don't double up.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable read access for public users', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable insert for all authenticated users', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable update for all authenticated users', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable delete for all authenticated users', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      'public_select_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
      'auth_insert_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      'auth_update_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
      'auth_delete_' || t, t);
  END LOOP;
END $$;
