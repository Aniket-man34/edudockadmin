-- Migration: Add schema_markup column to updates table
-- Purpose: Store JSON-LD schema markup for Google Rich Snippets (FAQ, Article, etc.)

ALTER TABLE updates ADD COLUMN IF NOT EXISTS schema_markup TEXT;

COMMENT ON COLUMN updates.schema_markup IS 'JSON-LD schema markup for Google Rich Snippets (e.g., FAQ, Article, BreadcrumbList)';