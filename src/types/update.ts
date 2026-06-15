export interface Update {
  id: string
  title: string
  content: string
  image_url: string | null
  external_url: string | null // Optional outbound link for "official site" updates
  slug: string | null
  meta_title: string | null
  meta_description: string | null
  schema_markup: Record<string, unknown> | null
  author_name: string | null
  author_avatar: string | null
  category_id: string | null
  clicks: number | null
  created_at: string
  updated_at: string | null
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
