export interface Pdf {
  id: string
  title: string
  description: string
  file_url: string
  cover_image_url: string | null
  file_type: 'upload' | 'drive' // Phase 3: upload = PDF file, drive = Google Drive link
  drive_link: string | null // Phase 3: Google Drive link when file_type = 'drive'
  author_name: string | null // Phase 5
  author_avatar: string | null // Phase 5
  category_id: string | null // Category reference
  created_at: string
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
