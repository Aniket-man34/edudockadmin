import { supabase, TABLES } from './supabase'

/**
 * Activity logging helper.
 *
 * Writes a row to the `activity_logs` table (created via migration) so the
 * admin dashboard can show an audit trail of created / edited / deleted /
 * published / archived actions.
 *
 * If the table doesn't exist yet (older DB), the insert fails silently so it
 * never blocks the primary operation.
 */

export type ActivityAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'schedule'

export type ActivityEntityType =
  | 'pdf'
  | 'update'
  | 'tool'
  | 'category'
  | 'message'
  | 'media'

export interface ActivityLogEntry {
  action: ActivityAction
  entity_type: ActivityEntityType
  entity_id: string
  entity_title?: string
  actor_name?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log an activity. Never throws — failures are swallowed so they can't break
 * the user-facing operation that triggered the log.
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      entity_title: entry.entity_title ?? null,
      actor_name: entry.actor_name ?? null,
      metadata: entry.metadata ?? null,
      created_at: new Date().toISOString(),
    })
  } catch {
    /* table may not exist yet — fail silently */
  }
}

/**
 * Fetch recent activity logs for the dashboard.
 */
export async function fetchRecentActivity(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

/**
 * Fetch all activity logs (paginated) for the Activity Logs page.
 */
export async function fetchActivityLogs(page = 1, pageSize = 25) {
  try {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) return { data: [], total: 0 }
    return { data: data ?? [], total: count ?? 0 }
  } catch {
    return { data: [], total: 0 }
  }
}

// Re-export TABLES so callers don't need a second import.
export { TABLES }
