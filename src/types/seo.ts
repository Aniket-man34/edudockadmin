export interface SiteSeoSettings {
  id: string
  page_name: string
  meta_title: string | null
  meta_description: string | null
  schema_markup: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface UpsertSiteSeoSettingsInput {
  page_name: string
  meta_title: string | null
  meta_description: string | null
  schema_markup: Record<string, unknown> | null
}