export interface Tool {
  id: string
  title: string
  description: string
  url: string
  image_url: string | null
  image_type: 'upload' | 'favicon' // Phase 3: upload = uploaded image, favicon = URL
  favicon_url: string | null // Phase 3: Favicon URL when image_type = 'favicon'
  author_name: string | null // Phase 5
  author_avatar: string | null // Phase 5
  category_id: string | null // Category reference
  created_at: string
}

export interface CreateToolInput {
  title: string
  description: string
  url: string
  image: File | null
  image_type: 'upload' | 'favicon'
  favicon_url: string | null
  category_id: string | null
}

export interface UpdateToolInput extends Partial<CreateToolInput> {
  id: string
}
