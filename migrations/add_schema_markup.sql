-- Migration: Add schema_markup column to updates table
-- Purpose: Store JSON-LD schema markup for Google Rich Snippets (FAQ, Article, etc.)
-- Run this against your Supabase project:
--   npx supabase db push
--
-- Comment on column for documentation
COMMENT ON COLUMN updates.schema_markup IS 'JSON-LD schema markup for Google Rich Snippets (e.g., FAQ, Article, BreadcrumbList)';