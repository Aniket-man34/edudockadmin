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
  slug: string | null // URL-friendly slug
  meta_title: string | null // SEO meta title (max ~60 chars)
  meta_description: string | null // SEO meta description (max ~160 chars)
  schema_markup: string | null // JSON-LD schema markup for Google Rich Snippets
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
