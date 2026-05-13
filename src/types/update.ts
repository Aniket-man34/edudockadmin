export interface Update {
  id: string
  title: string
  content: string
  image_url: string | null
  external_url: string | null // Phase 3: External URL field
  slug: string | null // URL-friendly slug
  meta_title: string | null // SEO meta title (max ~60 chars)
  meta_description: string | null // SEO meta description (max ~160 chars)
  author_name: string | null // Phase 5
  author_avatar: string | null // Phase 5
  category_id: string | null // Category reference
  created_at: string
}

export interface CreateUpdateInput {
  title: string
  content: string
  image: File | null
  external_url: string | null
  category_id: string | null
}

export interface UpdateUpdateInput extends Partial<CreateUpdateInput> {
  id: string
}
