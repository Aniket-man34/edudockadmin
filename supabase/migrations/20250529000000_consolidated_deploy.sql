-- ============================================================================
-- EduDock Admin — Consolidated Deployment Script
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor to apply all pending database
-- changes. Every statement is idempotent (uses IF NOT EXISTS / IF EXISTS)
-- so it's safe to re-run without data loss.
--
-- Covers:
--   1. SEO columns (meta_title, meta_description, slug) on updates/tools/pdfs
--   2. schema_markup TEXT → JSONB conversion on all 3 content tables
--   3. GRANT permissions for Data API exposure
--   4. updated_at triggers on all content tables
--   5. RLS policies — per-action policies for all public tables
--   6. Slug indexes for fast lookups
-- ============================================================================

-- ============================================================================
-- SECTION 1: Add missing SEO columns (idempotent)
-- ============================================================================

-- 1a. updates table
ALTER TABLE updates ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE updates ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE updates ADD COLUMN IF NOT EXISTS schema_markup TEXT;
CREATE INDEX IF NOT EXISTS idx_updates_slug ON updates(slug);

-- 1b. tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS schema_markup TEXT;
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);

-- 1c. pdfs table
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS schema_markup TEXT;
CREATE INDEX IF NOT EXISTS idx_pdfs_slug ON pdfs(slug);

-- ============================================================================
-- SECTION 2: Convert schema_markup TEXT → JSONB
-- ============================================================================
-- NULL and empty strings both become NULL so the JSONB cast doesn't fail.

ALTER TABLE updates
  ALTER COLUMN schema_markup TYPE JSONB
  USING CASE
    WHEN schema_markup IS NULL OR schema_markup = '' THEN NULL
    ELSE schema_markup::jsonb
  END;

ALTER TABLE tools
  ALTER COLUMN schema_markup TYPE JSONB
  USING CASE
    WHEN schema_markup IS NULL OR schema_markup = '' THEN NULL
    ELSE schema_markup::jsonb
  END;

ALTER TABLE pdfs
  ALTER COLUMN schema_markup TYPE JSONB
  USING CASE
    WHEN schema_markup IS NULL OR schema_markup = '' THEN NULL
    ELSE schema_markup::jsonb
  END;

-- ============================================================================
-- SECTION 3: Column comments
-- ============================================================================

COMMENT ON COLUMN updates.schema_markup IS 'JSONB — JSON-LD schema markup for Google Rich Snippets (e.g., FAQ, Article, BreadcrumbList)';
COMMENT ON COLUMN tools.schema_markup   IS 'JSONB — JSON-LD schema markup for Google Rich Snippets (e.g., SoftwareApplication, WebApplication)';
COMMENT ON COLUMN pdfs.schema_markup    IS 'JSONB — JSON-LD schema markup for Google Rich Snippets (e.g., ScholarlyArticle, DigitalDocument)';

-- ============================================================================
-- SECTION 4: GRANT permissions (Data API exposure)
-- ============================================================================
-- Without these the Supabase Data API won't expose the tables even with RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.updates    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tools      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pdfs       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO anon, authenticated;

-- ============================================================================
-- SECTION 5: updated_at triggers
-- ============================================================================

-- Create the trigger function if it doesn't exist yet
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to content tables (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_updates_updated_at ON updates;
CREATE TRIGGER update_updates_updated_at
  BEFORE UPDATE ON updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tools_updated_at ON tools;
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdfs_updated_at ON pdfs;
CREATE TRIGGER update_pdfs_updated_at
  BEFORE UPDATE ON pdfs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 6: RLS policies (per-action, TO authenticated)
-- ============================================================================
-- Drop old "FOR ALL" policies first, then recreate per-action policies.

-- 6a. pdfs
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.pdfs;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.pdfs;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.pdfs;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.pdfs;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.pdfs;

CREATE POLICY "Enable read access for all authenticated users" ON public.pdfs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.pdfs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.pdfs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.pdfs
  FOR DELETE TO authenticated USING (true);

-- 6b. updates
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.updates;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.updates;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.updates;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.updates;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.updates;

CREATE POLICY "Enable read access for all authenticated users" ON public.updates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.updates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.updates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.updates
  FOR DELETE TO authenticated USING (true);

-- 6c. tools
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.tools;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.tools;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.tools;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.tools;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.tools;

CREATE POLICY "Enable read access for all authenticated users" ON public.tools
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.tools
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.tools
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.tools
  FOR DELETE TO authenticated USING (true);

-- 6d. categories
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.categories;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.categories;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.categories;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.categories;

CREATE POLICY "Enable read access for all authenticated users" ON public.categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.categories
  FOR DELETE TO authenticated USING (true);

-- 6e. pdf_categories
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.pdf_categories;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.pdf_categories;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.pdf_categories;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.pdf_categories;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.pdf_categories;

CREATE POLICY "Enable read access for all authenticated users" ON public.pdf_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.pdf_categories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.pdf_categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.pdf_categories
  FOR DELETE TO authenticated USING (true);

-- 6f. analytics
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.analytics;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.analytics;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.analytics;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.analytics;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.analytics;

CREATE POLICY "Enable read access for all authenticated users" ON public.analytics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.analytics
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.analytics
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.analytics
  FOR DELETE TO authenticated USING (true);

-- 6g. admin_messages
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.admin_messages;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.admin_messages;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.admin_messages;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.admin_messages;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.admin_messages;

CREATE POLICY "Enable read access for all authenticated users" ON public.admin_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.admin_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.admin_messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.admin_messages
  FOR DELETE TO authenticated USING (true);

-- 6h. page_views
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.page_views;
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.page_views;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.page_views;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.page_views;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.page_views;

CREATE POLICY "Enable read access for all authenticated users" ON public.page_views
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.page_views
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.page_views
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.page_views
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- SECTION 7: Verification queries (run and review the output)
-- ============================================================================

-- 7a. Confirm schema_markup is JSONB on all three content tables
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('updates', 'tools', 'pdfs')
  AND column_name = 'schema_markup';

-- 7b. List all active RLS policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 7c. Confirm updated_at triggers exist
SELECT event_object_table AS table_name, trigger_name
FROM information_schema.triggers
WHERE trigger_name IN (
  'update_updates_updated_at',
  'update_tools_updated_at',
  'update_pdfs_updated_at'
)
ORDER BY event_object_table;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================