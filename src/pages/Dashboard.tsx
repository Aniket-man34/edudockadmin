import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Megaphone,
  Wrench,
  Loader2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase, TABLES } from '@/lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardStats {
  pdfCount: number
  updateCount: number
  toolCount: number
  visitorCount: number
  pdfsWithCovers: number
  updatesWithImages: number
  toolsWithImages: number
}

interface AnalyticsData {
  month: string
  visitor_count: number
  year: number
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
  })
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchAnalytics()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Use count: 'exact' with head: true for accurate counts
      const [pdfsRes, updatesRes, toolsRes, analyticsRes] = await Promise.all([
        supabase.from(TABLES.PDFS).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.UPDATES).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.TOOLS).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.ANALYTICS).select('visitor_count'),
      ])

      // Get counts with cover/images
      const [pdfsWithCoversRes, updatesWithImagesRes, toolsWithImagesRes] = await Promise.all([
        supabase.from(TABLES.PDFS).select('id', { count: 'exact', head: true }).not('cover_image_url', 'is', null),
        supabase.from(TABLES.UPDATES).select('id', { count: 'exact', head: true }).not('image_url', 'is', null),
        supabase.from(TABLES.TOOLS).select('id', { count: 'exact', head: true }).not('image_url', 'is', null),
      ])

      // Calculate total visitors from analytics
      const totalVisitors = analyticsRes.data?.reduce((sum, item) => sum + item.visitor_count, 0) || 0

      setStats({
        pdfCount: pdfsRes.count || 0,
        updateCount: updatesRes.count || 0,
        toolCount: toolsRes.count || 0,
        visitorCount: totalVisitors,
        pdfsWithCovers: pdfsWithCoversRes.count || 0,
        updatesWithImages: updatesWithImagesRes.count || 0,
        toolsWithImages: toolsWithImagesRes.count || 0,
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

  // Prepare chart data - show last 6 months
  const chartData = analyticsData.slice(-6).map(item => ({
    name: `${item.month.substring(0, 3)} ${item.year}`,
    visitors: item.visitor_count,
  }))

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600">Welcome to EduDock Admin</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            {statCards.map((stat) => (
              <div
                key={stat.title}
                className="bg-white rounded-xl border border-gray-200 p-3 md:p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow min-h-[44px]"
                onClick={() => stat.navigateTo !== '#' && navigate(stat.navigateTo)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                    <p className="text-xl md:text-3xl font-bold mt-1 md:mt-2">{stat.value}</p>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 truncate">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.color} p-2 md:p-3 rounded-lg flex-shrink-0`}>
                    <stat.icon className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Visitor Analytics Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm mb-6 md:mb-8">
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
                    <XAxis 
                      dataKey="name" 
                      stroke="#666"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={12}
                      tickFormatter={(value) => (value as number).toLocaleString()}
                    />
                    <Tooltip
                      formatter={(value) => [(value as number).toLocaleString(), 'Visitors']}
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
                  <p className="text-sm text-gray-400 mt-1">Visitor data will appear here once collected</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <Button
            className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
            onClick={() => navigate('/pdfs')}
          >
            <FileText className="h-6 w-6 md:h-8 md:w-8 mb-1 md:mb-2" />
            <span className="text-sm md:text-base">Manage PDFs</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
            onClick={() => navigate('/updates')}
          >
            <Megaphone className="h-6 w-6 md:h-8 md:w-8 mb-1 md:mb-2" />
            <span className="text-sm md:text-base">Manage Updates</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 md:h-24 flex flex-col items-center justify-center p-3 md:p-4"
            onClick={() => navigate('/tools')}
          >
            <Wrench className="h-6 w-6 md:h-8 md:w-8 mb-1 md:mb-2" />
            <span className="text-sm md:text-base">Manage Tools</span>
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-6 md:mt-8 bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 className="text-lg md:text-xl font-bold">System Status</h2>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-xs md:text-sm text-green-600">All Systems Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="font-medium">Database</p>
            <p className="text-sm text-gray-600">Supabase connection ready</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="font-medium">Storage</p>
            <p className="text-sm text-gray-600">4 buckets configured (pdf-covers, pdf-files, update-images, tool-images)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
