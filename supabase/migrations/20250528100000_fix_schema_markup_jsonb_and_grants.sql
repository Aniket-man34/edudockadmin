-- ============================================================================
-- Migration: Convert schema_markup from TEXT to JSONB + GRANT permissions
-- Purpose: JSONB is the correct type for JSON-LD structured data.
--          TEXT causes issues with Supabase JS client (won't auto-parse).
--          GRANT ensures Data API can access the tables.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- Step 1: Convert updates.schema_markup from TEXT to JSONB
-- NULL and empty strings both become NULL
ALTER TABLE updates 
  ALTER COLUMN schema_markup TYPE JSONB 
  USING CASE 
    WHEN schema_markup IS NULL OR schema_markup = '' THEN NULL 
    ELSE schema_markup::jsonb 
  END;

-- Step 2: Convert tools.schema_markup from TEXT to JSONB
ALTER TABLE tools 
  ALTER COLUMN schema_markup TYPE JSONB 
  USING CASE 
    WHEN schema_markup IS NULL OR schema_markup = '' THEN NULL 
    ELSE schema_markup::jsonb 
  END;

-- Step 3: Convert pdfs.schema_markup from TEXT to JSONB
ALTER TABLE pdfs 
  ALTER COLUMN schema_markup TYPE JSONB 
  USING CASE 
    WHEN schema_markup IS NULL OR schema_markup = '' THEN NULL 
    ELSE schema_markup::jsonb 
  END;

-- Step 4: Update column comments to reflect JSONB type
COMMENT ON COLUMN updates.schema_markup IS 'JSONB - JSON-LD schema markup for Google Rich Snippets (e.g., FAQ, Article, BreadcrumbList)';
COMMENT ON COLUMN tools.schema_markup IS 'JSONB - JSON-LD schema markup for Google Rich Snippets (e.g., SoftwareApplication, WebApplication)';
COMMENT ON COLUMN pdfs.schema_markup IS 'JSONB - JSON-LD schema markup for Google Rich Snippets (e.g., ScholarlyArticle, DigitalDocument)';

-- ============================================================================
-- Step 5: GRANT permissions for Data API exposure
-- CRITICAL: Without these, the Supabase Data API won't expose these tables
-- even with RLS policies in place.
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.updates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pdfs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO anon, authenticated;