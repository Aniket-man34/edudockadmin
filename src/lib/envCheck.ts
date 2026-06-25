import { supabase, STORAGE_BUCKETS } from './supabase'

/**
 * Environment & site-health checker.
 *
 * Validates that required env vars are present, the Supabase DB is reachable,
 * storage buckets exist, and reports a structured health summary for the
 * Site Health Dashboard.
 */

export interface HealthCheck {
  id: string
  label: string
  status: 'ok' | 'warning' | 'error'
  detail: string
}

export interface SiteHealthReport {
  checks: HealthCheck[]
  overall: 'ok' | 'warning' | 'error'
}

const REQUIRED_ENV_VARS: Array<{ key: string; label: string }> = [
  { key: 'VITE_SUPABASE_URL', label: 'Supabase URL' },
  { key: 'VITE_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
]

/**
 * Run all health checks and return a structured report.
 */
export async function runHealthChecks(): Promise<SiteHealthReport> {
  const checks: HealthCheck[] = []

  // 1. Environment variables
  for (const env of REQUIRED_ENV_VARS) {
    const value = import.meta.env[env.key]
    if (!value) {
      checks.push({
        id: `env-${env.key}`,
        label: `Env: ${env.label}`,
        status: 'error',
        detail: `${env.key} is not set. The app will fail to connect to Supabase.`,
      })
    } else {
      checks.push({
        id: `env-${env.key}`,
        label: `Env: ${env.label}`,
        status: 'ok',
        detail: `${env.key} is configured.`,
      })
    }
  }

  // 2. Database connectivity — attempt a lightweight count query.
  try {
    const { error } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
    if (error) {
      checks.push({
        id: 'db',
        label: 'Database',
        status: 'error',
        detail: `Query failed: ${error.message}`,
      })
    } else {
      checks.push({
        id: 'db',
        label: 'Database',
        status: 'ok',
        detail: 'Supabase database is reachable.',
      })
    }
  } catch (e) {
    checks.push({
      id: 'db',
      label: 'Database',
      status: 'error',
      detail: `Connection error: ${(e as Error).message}`,
    })
  }

  // 3. Storage buckets — list buckets and verify expected ones exist.
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) {
      checks.push({
        id: 'storage',
        label: 'Storage',
        status: 'warning',
        detail: `Could not list buckets: ${error.message}`,
      })
    } else {
      const bucketIds = new Set((buckets ?? []).map((b) => b.name))
      const expected = Object.values(STORAGE_BUCKETS)
      const missing = expected.filter((b) => !bucketIds.has(b))
      if (missing.length > 0) {
        checks.push({
          id: 'storage',
          label: 'Storage',
          status: 'warning',
          detail: `Missing buckets: ${missing.join(', ')}`,
        })
      } else {
        checks.push({
          id: 'storage',
          label: 'Storage',
          status: 'ok',
          detail: `All ${expected.length} storage buckets present.`,
        })
      }
    }
  } catch (e) {
    checks.push({
      id: 'storage',
      label: 'Storage',
      status: 'warning',
      detail: `Storage check error: ${(e as Error).message}`,
    })
  }

  // 4. Auth session — verify a session is active.
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      checks.push({
        id: 'auth',
        label: 'Auth',
        status: 'ok',
        detail: 'Admin session is active.',
      })
    } else {
      checks.push({
        id: 'auth',
        label: 'Auth',
        status: 'warning',
        detail: 'No active session — you may need to log in again.',
      })
    }
  } catch {
    checks.push({
      id: 'auth',
      label: 'Auth',
      status: 'warning',
      detail: 'Could not verify auth session.',
    })
  }

  // Overall status
  const hasError = checks.some((c) => c.status === 'error')
  const hasWarning = checks.some((c) => c.status === 'warning')
  const overall: SiteHealthReport['overall'] = hasError
    ? 'error'
    : hasWarning
      ? 'warning'
      : 'ok'

  return { checks, overall }
}
