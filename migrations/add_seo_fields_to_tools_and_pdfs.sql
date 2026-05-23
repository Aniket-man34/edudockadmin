-- ============================================================================
-- Migration: Add SEO meta fields to tools and pdfs tables
-- ============================================================================
-- Adds slug, meta_title, meta_description, and schema_markup columns
-- to both the tools and pdfs tables for SEO meta management.
-- Run via Supabase SQL Editor or `npx supabase db push`.
-- ============================================================================

-- ============================================================================
-- 1. SEO columns for tools table
-- ============================================================================
ALTER TABLE tools ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS schema_markup TEXT;

CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);

COMMENT ON COLUMN tools.slug IS 'URL-friendly slug for the tool detail page';
COMMENT ON COLUMN tools.meta_title IS 'Custom SEO title for Google search results (max ~60 chars)';
COMMENT ON COLUMN tools.meta_description IS 'Custom SEO description for Google search results (max ~160 chars)';
COMMENT ON COLUMN tools.schema_markup IS 'JSON-LD schema markup for Google Rich Snippets (e.g., SoftwareApplication, WebApplication)';

-- ============================================================================
-- 2. SEO columns for pdfs table
-- ============================================================================
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS schema_markup TEXT;

CREATE INDEX IF NOT EXISTS idx_pdfs_slug ON pdfs(slug);

COMMENT ON COLUMN pdfs.slug IS 'URL-friendly slug for the PDF detail page';
COMMENT ON COLUMN pdfs.meta_title IS 'Custom SEO title for Google search results (max ~60 chars)';
COMMENT ON COLUMN pdfs.meta_description IS 'Custom SEO description for Google search results (max ~160 chars)';
COMMENT ON COLUMN pdfs.schema_markup IS 'JSON-LD schema markup for Google Rich Snippets (e.g., ScholarlyArticle, DigitalDocument)';