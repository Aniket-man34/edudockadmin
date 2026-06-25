import React, { useState, useCallback } from 'react'
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  HardDrive,
  KeyRound,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  runHealthChecks,
  type SiteHealthReport,
  type HealthCheck,
} from '@/lib/envCheck'
import { cn } from '@/lib/utils'

const checkIcon = (id: string) => {
  if (id.startsWith('env')) return KeyRound
  if (id === 'db') return Database
  if (id === 'storage') return HardDrive
  if (id === 'auth') return Server
  return ShieldCheck
}

const statusIcon = (status: HealthCheck['status']) => {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5 text-green-500" />
  if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />
  return <XCircle className="h-5 w-5 text-red-500" />
}

const SiteHealth: React.FC = () => {
  const [report, setReport] = useState<SiteHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [rechecking, setRechecking] = useState(false)

  const runChecks = useCallback(async () => {
    setRechecking(true)
    try {
      const r = await runHealthChecks()
      setReport(r)
    } catch (e) {
      console.error('Health check failed:', e)
    } finally {
      setLoading(false)
      setRechecking(false)
    }
  }, [])

  React.useEffect(() => {
    runChecks()
  }, [runChecks])

  const okCount = report?.checks.filter((c) => c.status === 'ok').length ?? 0
  const warnCount = report?.checks.filter((c) => c.status === 'warning').length ?? 0
  const errCount = report?.checks.filter((c) => c.status === 'error').length ?? 0

  const overallColor =
    report?.overall === 'ok'
      ? 'bg-green-50 text-green-700 border-green-200'
      : report?.overall === 'warning'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-gray-400" />
            Site Health
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Monitor database, storage, auth, and environment configuration.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runChecks}
          disabled={rechecking}
        >
          {rechecking ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Re-run checks
        </Button>
      </div>

      {/* Overall banner */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Running health checks…</span>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'rounded-xl border p-4 md:p-6 flex items-center gap-4',
              overallColor,
            )}
          >
            <div className="p-3 rounded-full bg-white/60">
              {report?.overall === 'ok' && (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
              {report?.overall === 'warning' && (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              )}
              {report?.overall === 'error' && (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold">
                {report?.overall === 'ok'
                  ? 'All Systems Operational'
                  : report?.overall === 'warning'
                    ? 'Minor Issues Detected'
                    : 'Critical Issues Found'}
              </h2>
              <p className="text-sm opacity-90">
                {okCount} healthy · {warnCount} warnings · {errCount} errors
              </p>
            </div>
          </div>

          {/* Detailed checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report?.checks.map((check) => {
              const Icon = checkIcon(check.id)
              return (
                <div
                  key={check.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Icon className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {check.label}
                        </h3>
                        {statusIcon(check.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{check.detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Environment reference */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3">Environment Variables</h2>
            <p className="text-sm text-gray-600 mb-4">
              The admin app requires these variables in your{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                .env
              </code>{' '}
              file:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <code className="text-sm font-mono">VITE_SUPABASE_URL</code>
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    import.meta.env.VITE_SUPABASE_URL
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700',
                  )}
                >
                  {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <code className="text-sm font-mono">VITE_SUPABASE_ANON_KEY</code>
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    import.meta.env.VITE_SUPABASE_ANON_KEY
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700',
                  )}
                >
                  {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SiteHealth
