import { createClient } from '@supabase/supabase-js'

// Placeholder values - replace with your actual Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage bucket names
export const STORAGE_BUCKETS = {
  PDF_COVERS: 'pdf-covers',
  UPDATE_IMAGES: 'update-images',
  PDF_FILES: 'pdf-files',
  TOOL_IMAGES: 'tool-images',
} as const

// Table names
export const TABLES = {
  PDFS: 'pdfs',
  UPDATES: 'updates',
  TOOLS: 'tools',
  CATEGORIES: 'categories',
  MESSAGES: 'admin_messages',
  ANALYTICS: 'analytics',
  SEO_SETTINGS: 'site_seo_settings',
} as const