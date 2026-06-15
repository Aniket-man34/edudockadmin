export interface Pdf {
  id: string
  title: string
  description: string
  file_url: string
  cover_image_url: string | null
  file_type: 'upload' | 'drive'
  drive_link: string | null
  author_name: string | null
  author_avatar: string | null
  category_id: string | null
  slug: string | null
  meta_title: string | null
  meta_description: string | null
  schema_markup: Record<string, unknown> | null
  clicks: number | null
  created_at: string
  updated_at: string | null
}

export interface CreatePdfInput {
  title: string
  description: string
  file: File | null
  cover_image: File | null
  file_type: 'upload' | 'drive'
  drive_link: string | null
  category_id: string | null
}

export interface UpdatePdfInput extends Partial<CreatePdfInput> {
  id: string
}
