-- ============================================================================
-- Migration: Create site_seo_settings table for global SEO configuration
-- Purpose: Store homepage (and future page-level) SEO meta data including
--          meta title, meta description, and JSON-LD structured data.
-- ============================================================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.site_seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL UNIQUE,
  meta_title VARCHAR(200),
  meta_description TEXT,
  schema_markup JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Column comments
COMMENT ON TABLE public.site_seo_settings IS 'Global SEO configuration per page (homepage, etc.)';
COMMENT ON COLUMN public.site_seo_settings.page_name IS 'Unique page identifier, e.g. ''home''';
COMMENT ON COLUMN public.site_seo_settings.meta_title IS 'Custom SEO title for Google search results (max ~60 chars)';
COMMENT ON COLUMN public.site_seo_settings.meta_description IS 'Custom SEO description for Google search results (max ~160 chars)';
COMMENT ON COLUMN public.site_seo_settings.schema_markup IS 'JSONB — JSON-LD schema markup for Google Rich Snippets (e.g., Organization, WebSite)';

-- Step 3: Index on page_name for fast upsert lookups
CREATE INDEX IF NOT EXISTS idx_site_seo_settings_page_name ON public.site_seo_settings(page_name);

-- Step 4: Enable RLS
ALTER TABLE public.site_seo_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS policies — full CRUD for authenticated users
DROP POLICY IF EXISTS "Enable read access for all authenticated users"   ON public.site_seo_settings;
DROP POLICY IF EXISTS "Enable insert for all authenticated users"        ON public.site_seo_settings;
DROP POLICY IF EXISTS "Enable update for all authenticated users"        ON public.site_seo_settings;
DROP POLICY IF EXISTS "Enable delete for all authenticated users"        ON public.site_seo_settings;

CREATE POLICY "Enable read access for all authenticated users" ON public.site_seo_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.site_seo_settings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for all authenticated users" ON public.site_seo_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all authenticated users" ON public.site_seo_settings
  FOR DELETE TO authenticated USING (true);

-- Step 6: GRANT permissions for Data API exposure
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_seo_settings TO anon, authenticated;

-- Step 7: updated_at trigger
DROP TRIGGER IF EXISTS update_site_seo_settings_updated_at ON public.site_seo_settings;
CREATE TRIGGER update_site_seo_settings_updated_at
  BEFORE UPDATE ON public.site_seo_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();