export interface Category {
  id: string
  name: string
  entity_type: 'pdf' | 'update' | 'tool'
  created_at: string
}

export interface CreateCategoryInput {
  name: string
  entity_type: 'pdf' | 'update' | 'tool'
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string
}
