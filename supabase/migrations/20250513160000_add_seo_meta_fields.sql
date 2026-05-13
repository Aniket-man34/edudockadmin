-- ============================================================================
-- Migration: Add SEO meta fields to updates table
-- ============================================================================
-- Adds meta_title and meta_description columns for manual SEO control
-- These are used for Google search result previews and <meta> tags
-- ============================================================================

-- Add meta_title column (Google recommends 50-60 characters)
ALTER TABLE updates ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);

-- Add meta_description column (Google recommends 150-160 characters)
ALTER TABLE updates ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Add index on slug for faster lookups (if not already present)
CREATE INDEX IF NOT EXISTS idx_updates_slug ON updates(slug);

COMMENT ON COLUMN updates.meta_title IS 'Custom SEO title for Google search results (max ~60 chars)';
COMMENT ON COLUMN updates.meta_description IS 'Custom SEO description for Google search results (max ~160 chars)';