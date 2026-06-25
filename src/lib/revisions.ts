import { supabase, TABLES } from './supabase'

/**
 * Revision history helpers.
 *
 * Revisions are stored in a `content_revisions` table with the shape:
 *   id uuid pk
 *   entity_type text        -- 'pdf' | 'update' | 'tool'
 *   entity_id uuid          -- FK to the content row
 *   content jsonb           -- snapshot of the full row at save time
 *   author_name text
 *   created_at timestamptz
 *
 * If the table does not exist, all functions fail gracefully (return empty /
 * false) so the admin keeps working without a migration. Run the SQL in
 * docs/content_revisions.sql to enable.
 */

export type RevisionEntityType = 'pdf' | 'update' | 'tool'

export interface ContentRevision {
  id: string
  entity_type: string
  entity_id: string
  content: Record<string, unknown>
  author_name: string | null
  created_at: string
}

/**
 * Save a snapshot of a content row as a revision.
 * Never throws — returns false on failure.
 */
export async function saveRevision(
  entityType: RevisionEntityType,
  entityId: string,
  content: Record<string, unknown>,
  authorName?: string | null,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('content_revisions').insert({
      entity_type: entityType,
      entity_id: entityId,
      content,
      author_name: authorName ?? null,
    })
    if (error) {
      // Table likely missing — fail silently.
      if (!error.message.includes('does not exist') && !error.message.includes('Could not find')) {
        console.warn('saveRevision:', error.message)
      }
      return false
    }
    return true
  } catch (e) {
    console.warn('saveRevision error:', e)
    return false
  }
}

/**
 * Fetch revision history for a content item, newest first.
 */
export async function fetchRevisions(
  entityType: RevisionEntityType,
  entityId: string,
  limit = 20,
): Promise<ContentRevision[]> {
  try {
    const { data, error } = await supabase
      .from('content_revisions')
      .select('id, entity_type, entity_id, content, author_name, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (!error.message.includes('does not exist') && !error.message.includes('Could not find')) {
        console.warn('fetchRevisions:', error.message)
      }
      return []
    }
    return (data ?? []) as ContentRevision[]
  } catch (e) {
    console.warn('fetchRevisions error:', e)
    return []
  }
}

/**
 * Delete a revision by id.
 */
export async function deleteRevision(revisionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_revisions')
      .delete()
      .eq('id', revisionId)
    if (error) {
      console.warn('deleteRevision:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn('deleteRevision error:', e)
    return false
  }
}

/**
 * Count revisions for a content item (for badges / indicators).
 */
export async function countRevisions(
  entityType: RevisionEntityType,
  entityId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('content_revisions')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export const REVISIONS_TABLE = 'content_revisions'
export { TABLES }
