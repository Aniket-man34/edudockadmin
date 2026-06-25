import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Megaphone,
  Wrench,
  Loader2,
  Users,
  Plus,
  Settings,
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Edit3,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase, TABLES } from '@/lib/supabase'
import { runHealthChecks, type SiteHealthReport, type HealthCheck } from '@/lib/envCheck'
import { fetchRecentActivity } from '@/lib/activityLog'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

interface DashboardStats {
  pdfCount: number
  updateCount: number
  toolCount: number
  visitorCount: number
  pdfsWithCovers: number
  updatesWithImages: number
  toolsWithImages: number
  // Phase 2: status breakdowns
  draftCount: number
  publishedCount: number
  scheduledCount: number
}

interface AnalyticsData {
  month: string
  visitor_count: number
  year: number
}

interface RecentItem {
  id: string
  title: string
  type: 'pdf' | 'update' | 'tool'
  updated_at: string | null
  status?: string | null
}

interface ActivityRow {
  id: string
  action: string
  entity_type: string
  entity_title: string | null
  actor_name: string | null
  created_at: string
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    pdfCount: 0,
    updateCount: 0,
    toolCount: 0,
    visitorCount: 0,
    pdfsWithCovers: 0,
    updatesWithImages: 0,
    toolsWithImages: 0,
    draftCount: 0,
    publishedCount: 0,
    scheduledCount: 0,
  })
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [health, setHealth] = useState<SiteHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchAnalytics()
    fetchRecent()
    fetchActivity()
    fetchHealth()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [pdfsRes, updatesRes, toolsRes, analyticsRes] = await Promise.all([
        supabase.from(TABLES.PDFS).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.UPDATES).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.TOOLS).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.ANALYTICS).select('visitor_count'),
      ])

      const [pdfsWithCoversRes, updatesWithImagesRes, toolsWithImagesRes] =
        await Promise.all([
          supabase
            .from(TABLES.PDFS)
            .select('id', { count: 'exact', head: true })
            .not('cover_image_url', 'is', null),
          supabase
            .from(TABLES.UPDATES)
            .select('id', { count: 'exact', head: true })
            .not('image_url', 'is', null),
          supabase
            .from(TABLES.TOOLS)
            .select('id', { count: 'exact', head: true })
            .not('image_url', 'is', null),
        ])

      // Phase 2: status breakdowns across all content tables.
      const [pdfDrafts, updateDrafts, toolDrafts] = await Promise.all([
        supabase
          .from(TABLES.PDFS)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from(TABLES.UPDATES)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from(TABLES.TOOLS)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
      ])

      const [pdfScheduled, updateScheduled, toolScheduled] = await Promise.all([
        supabase
          .from(TABLES.PDFS)
          .select('id', { count: 'exact', head: true })
          .not('scheduled_at', 'is', null),
        supabase
          .from(TABLES.UPDATES)
          .select('id', { count: 'exact', head: true })
          .not('scheduled_at', 'is', null),
        supabase
          .from(TABLES.TOOLS)
          .select('id', { count: 'exact', head: true })
          .not('scheduled_at', 'is', null),
      ])

      const totalVisitors =
        analyticsRes.data?.reduce((sum, item) => sum + item.visitor_count, 0) ||
        0

      const draftCount =
        (pdfDrafts.count || 0) +
        (updateDrafts.count || 0) +
        (toolDrafts.count || 0)
      const scheduledCount =
        (pdfScheduled.count || 0) +
        (updateScheduled.count || 0) +
        (toolScheduled.count || 0)
      const publishedCount =
        (pdfsRes.count || 0) +
        (updatesRes.count || 0) +
        (toolsRes.count || 0) -
        draftCount

      setStats({
        pdfCount: pdfsRes.count || 0,
        updateCount: updatesRes.count || 0,
        toolCount: toolsRes.count || 0,
        visitorCount: totalVisitors,
        pdfsWithCovers: pdfsWithCoversRes.count || 0,
        updatesWithImages: updatesWithImagesRes.count || 0,
        toolsWithImages: toolsWithImagesRes.count || 0,
        draftCount,
        publishedCount: Math.max(0, publishedCount),
        scheduledCount,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ANALYTICS)
        .select('*')
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (error) throw error
      setAnalyticsData(data || [])
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const fetchRecent = useCallback(async () => {
    try {
      // Fetch the 5 most recently updated items across all content tables.
      const [pdfs, updates, tools] = await Promise.all([
        supabase
          .from(TABLES.PDFS)
          .select('id, title, updated_at, status')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(5),
        supabase
          .from(TABLES.UPDATES)
          .select('id, title, updated_at, status')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(5),
        supabase
          .from(TABLES.TOOLS)
          .select('id, title, updated_at, status')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(5),
      ])

      const combined: RecentItem[] = [
        ...(pdfs.data || []).map((p) => ({
          ...p,
          type: 'pdf' as const,
        })),
        ...(updates.data || []).map((u) => ({
          ...u,
          type: 'update' as const,
        })),
        ...(tools.data || []).map((t) => ({
          ...t,
          type: 'tool' as const,
        })),
      ]
        .sort((a, b) => {
          const ad = a.updated_at ? new Date(a.updated_at).getTime() : 0
          const bd = b.updated_at ? new Date(b.updated_at).getTime() : 0
          return bd - ad
        })
        .slice(0, 6)

      setRecentItems(combined)
    } catch (error) {
      console.error('Error fetching recent items:', error)
    }
  }, [])

  const fetchActivity = async () => {
    try {
      const rows = await fetchRecentActivity(6)
      setActivity(rows as ActivityRow[])
    } catch {
      setActivity([])
    }
  }

  const fetchHealth = async () => {
    setHealthLoading(true)
    try {
      const report = await runHealthChecks()
      setHealth(report)
    } catch (error) {
      console.error('Error running health checks:', error)
    } finally {
      setHealthLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total PDFs',
      value: stats.pdfCount,
      subtitle: `${stats.pdfsWithCovers} with covers`,
      icon: FileText,
      color: 'bg-blue-500',
      navigateTo: '/pdfs',
    },
    {
      title: 'Updates',
      value: stats.updateCount,
      subtitle: `${stats.updatesWithImages} with images`,
      icon: Megaphone,
      color: 'bg-green-500',
      navigateTo: '/updates',
    },
    {
      title: 'Tools',
      value: stats.toolCount,
      subtitle: `${stats.toolsWithImages} with images`,
      icon: Wrench,
      color: 'bg-purple-500',
      navigateTo: '/tools',
    },
    {
      title: 'Total Visitors',
      value: stats.visitorCount.toLocaleString(),
      subtitle: 'Monthly analytics tracking',
      icon: Users,
      color: 'bg-amber-500',
      navigateTo: '#',
    },
  ]

  const statusCards = [
    {
      label: 'Published',
      value: stats.publishedCount,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Drafts',
      value: stats.draftCount,
      icon: Edit3,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Scheduled',
      value: stats.scheduledCount,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
    },
  ]

  const chartData = analyticsData.slice(-6).map((item) => ({
    name: `${item.month.substring(0, 3)} ${item.year}`,
    visitors: item.visitor_count,
  }))

  const typeIcon = (type: RecentItem['type']) => {
    if (type === 'pdf') return FileText
    if (type === 'update') return Megaphone
    return Wrench
  }

  const typeRoute = (type: RecentItem['type']) => {
    if (type === 'pdf') return '/pdfs'
    if (type === 'update') return '/updates'
    return '/tools'
  }

  const formatRelative = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const healthIcon = (status: HealthCheck['status']) => {
    if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const overallColor =
    health?.overall === 'ok'
      ? 'text-green-600'
      : health?.overall === 'warning'
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600">
            Welcome to EduDock Admin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/media')}
          >
            <Settings className="h-4 w-4 mr-1.5" />
            Media Library
          </Button>
          <Button size="sm" onClick={() => navigate('/health')}>
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Site Health
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading statistics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {statCards.map((stat) => (
              <div
                key={stat.title}
                className="bg-white rounded-xl border border-gray-200 p-3 md:p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow min-h-[44px]"
                onClick={() => stat.navigateTo !== '#' && navigate(stat.navigateTo)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                      {stat.title}
                    </p>
                    <p className="text-xl md:text-3xl font-bold mt-1 md:mt-2">
                      {stat.value}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 truncate">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className={`${stat.color} p-2 md:p-3 rounded-lg flex-shrink-0`}>
                    <stat.icon className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {statusCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-gray-200 p-3 md:p-5 shadow-sm flex items-center gap-3"
              >
                <div className={cn('p-2 rounded-lg', card.color)}>
                  <card.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold">{card.value}</p>
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    {card.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Visitor Analytics Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
              <h2 className="text-lg md:text-xl font-bold">Visitor Analytics</h2>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs md:text-sm text-gray-600">Last 6 months</span>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} />
                    <YAxis
                      stroke="#666"
                      fontSize={12}
                      tickFormatter={(value) => (value as number).toLocaleString()}
                    />
                    <Tooltip
                      formatter={(value) => [
                        (value as number).toLocaleString(),
                        'Visitors',
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 md:h-80 flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No analytics data available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Visitor data will appear here once collected
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Two-column: Recent edits + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Recently Edited */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  Recently Edited
                </h2>
                <button
                  onClick={() => navigate('/pdfs')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {recentItems.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {recentItems.map((item) => {
                    const Icon = typeIcon(item.type)
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          onClick={() => navigate(typeRoute(item.type))}
                          className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                        >
                          <div className="p-1.5 rounded-lg bg-gray-100">
                            <Icon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {item.type}
                              {item.status ? ` · ${item.status}` : ''}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {formatRelative(item.updated_at)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No recent edits.
                </p>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                  Recent Activity
                </h2>
                <button
                  onClick={() => navigate('/activity')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {activity.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {activity.map((row) => (
                    <li
                      key={row.id}
                      className="py-2.5 flex items-center gap-3"
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium capitalize">
                            {row.action}
                          </span>{' '}
                          <span className="text-gray-500">{row.entity_type}</span>
                          {row.entity_title && (
                            <span className="text-gray-700">
                              {' '}
                              — {row.entity_title}
                            </span>
                          )}
                        </p>
                        {row.actor_name && (
                          <p className="text-xs text-gray-400">by {row.actor_name}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatRelative(row.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No activity logged yet.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Button
                className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
                onClick={() => navigate('/pdfs')}
              >
                <Plus className="h-5 w-5 md:h-7 md:w-7 mb-1 md:mb-2" />
                <span className="text-xs md:text-sm">New PDF</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
                onClick={() => navigate('/updates')}
              >
                <Plus className="h-5 w-5 md:h-7 md:w-7 mb-1 md:mb-2" />
                <span className="text-xs md:text-sm">New Update</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
                onClick={() => navigate('/tools')}
              >
                <Plus className="h-5 w-5 md:h-7 md:w-7 mb-1 md:mb-2" />
                <span className="text-xs md:text-sm">New Tool</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
                onClick={() => navigate('/media')}
              >
                <Eye className="h-5 w-5 md:h-7 md:w-7 mb-1 md:mb-2" />
                <span className="text-xs md:text-sm">Media Library</span>
              </Button>
            </div>
          </div>

          {/* Site Health Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
                Site Health
              </h2>
              <div className="flex items-center gap-2">
                {healthLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <>
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        health?.overall === 'ok'
                          ? 'bg-green-500'
                          : health?.overall === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                      )}
                    />
                    <span className={cn('text-xs md:text-sm font-medium', overallColor)}>
                      {health?.overall === 'ok'
                        ? 'All Systems Operational'
                        : health?.overall === 'warning'
                          ? 'Minor Issues Detected'
                          : 'Critical Issues'}
                    </span>
                  </>
                )}
              </div>
            </div>
            {health && !healthLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {health.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="mt-0.5">{healthIcon(check.status)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {check.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/health')}
              >
                View Full Health Report
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
