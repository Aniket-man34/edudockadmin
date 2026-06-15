export interface Tool {
  id: string
  title: string
  short_description: string | null // One-line tagline shown in cards & SEO snippets
  description: string
  url: string
  image_url: string | null
  image_type: 'upload' | 'favicon'
  favicon_url: string | null
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

export interface CreateToolInput {
  title: string
  short_description: string | null
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
