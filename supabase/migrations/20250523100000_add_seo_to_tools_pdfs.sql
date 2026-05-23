-- Migration: Add SEO columns (slug, meta_title, meta_description, schema_markup) to tools and pdfs tables
-- Run via: npx supabase db push

-- Tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS schema_markup TEXT;
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);

-- Pdfs table
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS schema_markup TEXT;
CREATE INDEX IF NOT EXISTS idx_pdfs_slug ON pdfs(slug);