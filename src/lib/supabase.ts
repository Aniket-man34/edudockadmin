import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly at boot rather than silently using a placeholder client.
  // A placeholder client lets the UI render but every query 404s, which
  // produces empty tables and confused users instead of an actionable error.
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ')
  throw new Error(
    `Supabase config missing: ${missing}. Set these in .env (admin) and rebuild.`,
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

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
