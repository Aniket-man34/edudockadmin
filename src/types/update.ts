export interface Update {
  id: string
  title: string
  content: string
  image_url: string | null
  slug: string | null // URL-friendly slug
  meta_title: string | null // SEO meta title (max ~60 chars)
  meta_description: string | null // SEO meta description (max ~160 chars)
  schema_markup: string | null // JSON-LD schema markup for Google Rich Snippets
  author_name: string | null // Phase 5
  author_avatar: string | null // Phase 5
  category_id: string | null // Category reference
  created_at: string
}

export interface CreateUpdateInput {
  title: string
  content: string
  image: File | null
  category_id: string | null
}

export interface UpdateUpdateInput extends Partial<CreateUpdateInput> {
  id: string
}
