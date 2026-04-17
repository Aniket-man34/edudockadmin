-- Fix RLS Policies for EduDock136
-- This script drops existing policies and recreates them with optimized auth checks
-- Using (select auth.uid()) instead of auth.uid() for better performance

-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.pdfs;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.updates;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.tools;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.pdf_categories;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.analytics;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.admin_messages;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.page_views;

-- Create optimized policies for pdfs
CREATE POLICY "Enable read access for all authenticated users" ON public.pdfs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.pdfs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.pdfs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.pdfs
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for updates
CREATE POLICY "Enable read access for all authenticated users" ON public.updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.updates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.updates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.updates
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for tools
CREATE POLICY "Enable read access for all authenticated users" ON public.tools
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.tools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.tools
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.tools
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for categories
CREATE POLICY "Enable read access for all authenticated users" ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for pdf_categories
CREATE POLICY "Enable read access for all authenticated users" ON public.pdf_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.pdf_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.pdf_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.pdf_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for analytics
CREATE POLICY "Enable read access for all authenticated users" ON public.analytics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.analytics
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.analytics
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for admin_messages
CREATE POLICY "Enable read access for all authenticated users" ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.admin_messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.admin_messages
  FOR DELETE
  TO authenticated
  USING (true);

-- Create optimized policies for page_views
CREATE POLICY "Enable read access for all authenticated users" ON public.page_views
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON public.page_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON public.page_views
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON public.page_views
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify policies are created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
