import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Archive,
  RotateCcw,
  Calendar,
  Loader2,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { fetchActivityLogs } from '@/lib/activityLog'
import { cn } from '@/lib/utils'

interface ActivityLogRow {
  id: string
  action: string
  entity_type: string
  entity_id: string
  entity_title: string | null
  actor_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTION_META: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  create: { icon: Plus, color: 'text-green-600 bg-green-50', label: 'Created' },
  edit: { icon: Edit3, color: 'text-blue-600 bg-blue-50', label: 'Edited' },
  delete: { icon: Trash2, color: 'text-red-600 bg-red-50', label: 'Deleted' },
  publish: { icon: Eye, color: 'text-purple-600 bg-purple-50', label: 'Published' },
  unpublish: { icon: Eye, color: 'text-gray-600 bg-gray-50', label: 'Unpublished' },
  archive: { icon: Archive, color: 'text-amber-600 bg-amber-50', label: 'Archived' },
  restore: { icon: RotateCcw, color: 'text-teal-600 bg-teal-50', label: 'Restored' },
  schedule: { icon: Calendar, color: 'text-indigo-600 bg-indigo-50', label: 'Scheduled' },
}

const ActivityLogs: React.FC = () => {
  const [rows, setRows] = useState<ActivityLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>('all')

  const pageSize = 25

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, total: t } = await fetchActivityLogs(page, pageSize)
      setRows(data as ActivityLogRow[])
      setTotal(t)
    } catch (e) {
      console.error('Error fetching activity logs:', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filtered =
    actionFilter === 'all'
      ? rows
      : rows.filter((r) => r.action === actionFilter)

  const columns: DataTableColumn<ActivityLogRow>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => {
        const meta = ACTION_META[row.action] ?? {
          icon: Activity,
          color: 'text-gray-600 bg-gray-50',
          label: row.action,
        }
        const Icon = meta.icon
        return (
          <span className="inline-flex items-center gap-2">
            <span className={cn('p-1.5 rounded-lg', meta.color)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-medium">{meta.label}</span>
          </span>
        )
      },
    },
    {
      key: 'entity_type',
      header: 'Type',
      render: (row) => (
        <span className="text-sm capitalize text-gray-600">
          {row.entity_type}
        </span>
      ),
    },
    {
      key: 'entity_title',
      header: 'Item',
      render: (row) => (
        <span className="text-sm text-gray-900 truncate max-w-xs block">
          {row.entity_title ?? row.entity_id}
        </span>
      ),
    },
    {
      key: 'actor_name',
      header: 'Actor',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.actor_name ?? 'System'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'When',
      render: (row) => {
        const d = new Date(row.created_at)
        return (
          <span className="text-sm text-gray-500">
            {d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            {d.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )
      },
    },
  ]

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-7 w-7 text-gray-400" />
          Activity Logs
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Audit trail of all content changes ({total.toLocaleString()} total
          events).
        </p>
      </div>

      {/* Action filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter className="h-4 w-4" /> Filter:
        </span>
        <button
          onClick={() => setActionFilter('all')}
          className={cn(
            'px-3 py-1.5 text-xs rounded-full transition-colors',
            actionFilter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          All
        </button>
        {Object.entries(ACTION_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setActionFilter(key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full transition-colors capitalize',
              actionFilter === key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        pageSize={pageSize}
        searchable
        searchPlaceholder="Search activity…"
        loading={loading}
        emptyMessage="No activity logs found. Logs appear here once content is created, edited, or deleted."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityLogs
