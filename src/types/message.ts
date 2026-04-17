export interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_avatar: string | null
  created_at: string
  is_read: boolean
  parent_id: string | null
}

export interface CreateMessageInput {
  content: string
  sender_id: string
  sender_name: string
  sender_avatar: string | null
  parent_id?: string | null
}

export interface UpdateMessageInput {
  is_read?: boolean
}
