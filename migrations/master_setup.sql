-- ============================================================================
-- EduDock Admin - Master SQL Setup Script
-- ============================================================================
-- This script configures the entire Admin database backend in one execution.
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE/VERIFY TABLES
-- ============================================================================

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS pdf_categories CASCADE;
DROP TABLE IF EXISTS pdfs CASCADE;
DROP TABLE IF EXISTS updates CASCADE;
DROP TABLE IF EXISTS tools CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS admin_messages CASCADE;

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('pdf', 'update', 'tool')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pdfs table
CREATE TABLE pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  file_url TEXT,
  cover_image_url TEXT,
  file_type VARCHAR(20) DEFAULT 'upload' CHECK (file_type IN ('upload', 'drive')),
  drive_link TEXT,
  slug TEXT,
  author_name VARCHAR(255),
  author_avatar TEXT,
  clicks INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updates table
CREATE TABLE updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT,
  image_url TEXT,
  external_url TEXT,
  slug TEXT,
  author_name VARCHAR(255),
  author_avatar TEXT,
  clicks INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tools table
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  short_description TEXT,
  description TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  image_type VARCHAR(20) DEFAULT 'upload' CHECK (image_type IN ('upload', 'favicon')),
  favicon_url TEXT,
  author_name VARCHAR(255),
  author_avatar TEXT,
  clicks INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pdf_categories table (simple category list for PDFs)
CREATE TABLE pdf_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT,
  month TEXT NOT NULL,
  visitor_count INTEGER DEFAULT 0,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_messages table
CREATE TABLE admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name VARCHAR(255) NOT NULL,
  sender_avatar TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES admin_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create page_views table for tracking page visits
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Categories indexes
CREATE INDEX idx_categories_entity_type ON categories(entity_type);

-- PDFs indexes
CREATE INDEX idx_pdfs_category_id ON pdfs(category_id);
CREATE INDEX idx_pdfs_created_at ON pdfs(created_at DESC);

-- Updates indexes
CREATE INDEX idx_updates_category_id ON updates(category_id);
CREATE INDEX idx_updates_created_at ON updates(created_at DESC);

-- Tools indexes
CREATE INDEX idx_tools_category_id ON tools(category_id);
CREATE INDEX idx_tools_created_at ON tools(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_month_year ON analytics(month, year);
CREATE INDEX idx_analytics_year ON analytics(year);

-- Admin messages indexes
CREATE INDEX idx_admin_messages_sender_id ON admin_messages(sender_id);
CREATE INDEX idx_admin_messages_created_at ON admin_messages(created_at DESC);
CREATE INDEX idx_admin_messages_is_read ON admin_messages(is_read);
CREATE INDEX idx_admin_messages_parent_id ON admin_messages(parent_id);

-- Page views indexes
CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);

-- ============================================================================
-- PHASE 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 4: RESET EXISTING POLICIES
-- ============================================================================

-- Drop any existing policies on all tables
DROP POLICY IF EXISTS "Admins can view all categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

DROP POLICY IF EXISTS "Admins can view all pdfs" ON pdfs;
DROP POLICY IF EXISTS "Authenticated users can insert pdfs" ON pdfs;
DROP POLICY IF EXISTS "Authenticated users can update pdfs" ON pdfs;
DROP POLICY IF EXISTS "Authenticated users can delete pdfs" ON pdfs;

DROP POLICY IF EXISTS "Admins can view all updates" ON updates;
DROP POLICY IF EXISTS "Authenticated users can insert updates" ON updates;
DROP POLICY IF EXISTS "Authenticated users can update updates" ON updates;
DROP POLICY IF EXISTS "Authenticated users can delete updates" ON updates;

DROP POLICY IF EXISTS "Admins can view all tools" ON tools;
DROP POLICY IF EXISTS "Authenticated users can insert tools" ON tools;
DROP POLICY IF EXISTS "Authenticated users can update tools" ON tools;
DROP POLICY IF EXISTS "Authenticated users can delete tools" ON tools;

DROP POLICY IF EXISTS "Admins can view all pdf_categories" ON pdf_categories;
DROP POLICY IF EXISTS "Authenticated users can insert pdf_categories" ON pdf_categories;
DROP POLICY IF EXISTS "Authenticated users can delete pdf_categories" ON pdf_categories;

DROP POLICY IF EXISTS "Admins can view all analytics" ON analytics;
DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON analytics;
DROP POLICY IF EXISTS "Authenticated users can update analytics" ON analytics;

DROP POLICY IF EXISTS "Admins can view all messages" ON admin_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can update their message read status" ON admin_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON admin_messages;

DROP POLICY IF EXISTS "Allow full access to authenticated users" ON page_views;

-- ============================================================================
-- PHASE 5: CREATE PERMISSIVE POLICIES FOR AUTHENTICATED USERS
-- ============================================================================

-- Categories policies
CREATE POLICY "Allow full access to authenticated users" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- PDFs policies
CREATE POLICY "Allow full access to authenticated users" ON pdfs
  FOR ALL USING (auth.role() = 'authenticated');

-- Updates policies
CREATE POLICY "Allow full access to authenticated users" ON updates
  FOR ALL USING (auth.role() = 'authenticated');

-- Tools policies
CREATE POLICY "Allow full access to authenticated users" ON tools
  FOR ALL USING (auth.role() = 'authenticated');

-- PDF Categories policies
CREATE POLICY "Allow full access to authenticated users" ON pdf_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Analytics policies
CREATE POLICY "Allow full access to authenticated users" ON analytics
  FOR ALL USING (auth.role() = 'authenticated');

-- Admin Messages policies
CREATE POLICY "Allow full access to authenticated users" ON admin_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Page Views policies
CREATE POLICY "Allow full access to authenticated users" ON page_views
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- PHASE 6: ENABLE REALTIME FOR MESSAGING AND ANALYTICS
-- ============================================================================

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE page_views;

-- ============================================================================
-- PHASE 7: CREATE STORAGE BUCKETS
-- ============================================================================

-- Note: Storage buckets must be created via Supabase Dashboard or CLI
-- The following SQL creates the buckets if they don't exist
-- Run these commands in Supabase Dashboard → Storage → New Bucket

-- Bucket names for reference:
-- 1. pdf-covers - Stores PDF cover images
-- 2. update-images - Stores update/news images
-- 3. pdf-files - Stores uploaded PDF files
-- 4. tool-images - Stores tool images

-- Enable storage extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "storage";

-- Create storage buckets (if they don't exist)
-- Note: These commands may need to be run via Supabase Dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pdf-covers', 'pdf-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('update-images', 'update-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('pdf-files', 'pdf-files', true, 10485760, ARRAY['application/pdf']),
  ('tool-images', 'tool-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHASE 8: CREATE EDGE FUNCTION WEBHOOK TRIGGERS
-- ============================================================================

-- Function to trigger Edge Function on DELETE events
-- This automatically deletes storage files when database rows are deleted
CREATE OR REPLACE FUNCTION notify_storage_deletion()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Construct webhook payload
  payload := json_build_object(
    'type', 'DELETE',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'old_record', row_to_json(OLD)
  );

  -- Send HTTP request to Edge Function
  -- Note: Replace YOUR_PROJECT_REF with your actual Supabase project reference
  -- This requires the Edge Function to be deployed first
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-storage-file',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', COALESCE(current_setting('app.webhook_secret', true), '')
    ),
    body := payload
  );

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the DELETE operation
  RAISE WARNING 'Failed to notify storage deletion: %', SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Enable HTTP extension for webhook calls
CREATE EXTENSION IF NOT EXISTS "http";

-- Create triggers for automatic storage file deletion
DROP TRIGGER IF EXISTS trigger_pdfs_storage_deletion ON pdfs;
CREATE TRIGGER trigger_pdfs_storage_deletion
  AFTER DELETE ON pdfs
  FOR EACH ROW
  EXECUTE FUNCTION notify_storage_deletion();

DROP TRIGGER IF EXISTS trigger_updates_storage_deletion ON updates;
CREATE TRIGGER trigger_updates_storage_deletion
  AFTER DELETE ON updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_storage_deletion();

DROP TRIGGER IF EXISTS trigger_tools_storage_deletion ON tools;
CREATE TRIGGER trigger_tools_storage_deletion
  AFTER DELETE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION notify_storage_deletion();

-- ============================================================================
-- PHASE 9: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analytics table
CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pdfs table
CREATE TRIGGER update_pdfs_updated_at
  BEFORE UPDATE ON pdfs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updates table
CREATE TRIGGER update_updates_updated_at
  BEFORE UPDATE ON updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tools table
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM admin_messages 
  WHERE NOT is_read AND sender_id != user_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- PHASE 10: SEED DATA
-- ============================================================================

-- Seed categories
INSERT INTO categories (name, entity_type) VALUES
  ('Academic', 'pdf'),
  ('Technical', 'pdf'),
  ('Research', 'pdf'),
  ('Announcements', 'update'),
  ('News', 'update'),
  ('Productivity', 'tool'),
  ('Development', 'tool'),
  ('Design', 'tool')
ON CONFLICT DO NOTHING;

-- Seed analytics with 4 months of data (January - April 2025)
INSERT INTO analytics (month, visitor_count, year) VALUES
  ('January', 1250, 2025),
  ('February', 1420, 2025),
  ('March', 1580, 2025),
  ('April', 1720, 2025)
ON CONFLICT DO NOTHING;

-- Seed sample admin messages
INSERT INTO admin_messages (content, sender_id, sender_name, sender_avatar, is_read) VALUES
  ('Welcome to EduDock admin messaging system!', '00000000-0000-0000-0000-000000000000', 'System Admin', 'https://ui-avatars.com/api/?name=System+Admin&background=0D8ABC&color=fff', true),
  ('Please review new PDF uploads when you have time.', '00000000-0000-0000-0000-000000000000', 'Content Manager', 'https://ui-avatars.com/api/?name=Content+Manager&background=10B981&color=fff', false),
  ('The server maintenance is scheduled for tomorrow at 2 AM.', '00000000-0000-0000-0000-000000000000', 'System Admin', 'https://ui-avatars.com/api/?name=System+Admin&background=0D8ABC&color=fff', false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 11: ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE categories IS 'Stores categories for PDFs, Updates, and Tools';
COMMENT ON TABLE pdfs IS 'Stores PDF resources with upload and Google Drive support';
COMMENT ON TABLE updates IS 'Stores news and updates with optional external URLs';
COMMENT ON TABLE tools IS 'Stores external tools and resources';
COMMENT ON TABLE pdf_categories IS 'Simple category list for PDFs';
COMMENT ON TABLE analytics IS 'Stores monthly visitor statistics for dashboard';
COMMENT ON TABLE admin_messages IS 'Stores messages between admin users with Google profile integration';
COMMENT ON TABLE page_views IS 'Tracks page visits for analytics';

COMMENT ON COLUMN admin_messages.sender_name IS 'Cached Google display name from user metadata';
COMMENT ON COLUMN admin_messages.sender_avatar IS 'Cached Google avatar URL from user metadata';
COMMENT ON COLUMN admin_messages.parent_id IS 'Optional parent message ID for threaded conversations';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Your EduDock Admin database is now fully configured!
--
-- IMPORTANT: After running this script, you need to:
--
-- 1. Deploy the Edge Function:
--    supabase functions deploy delete-storage-file
--
-- 2. Set environment variables for the Edge Function:
--    - SUPABASE_URL: Your Supabase project URL
--    - SERVICE_ROLE_KEY: Your Supabase service role key (from Dashboard → Settings → API)
--    - WEBHOOK_SECRET: A random secret string for webhook authentication
--
-- 3. Update the webhook URL in the notify_storage_deletion() function:
--    Replace 'YOUR_PROJECT_REF' with your actual project reference
--
-- 4. Set the webhook secret in the database:
--    ALTER DATABASE SET app.webhook_secret = 'your-secret-here';
--
-- 5. Verify storage buckets are created in Supabase Dashboard → Storage
-- ============================================================================
