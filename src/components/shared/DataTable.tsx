import React, { useMemo, useState } from 'react'
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  Loader2,
  Inbox,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc' | null

export interface DataTableColumn<T> {
  /** Unique key — must match a property on T or be used by the accessor. */
  key: string
  header: string
  /** Optional custom cell renderer. */
  render?: (row: T) => React.ReactNode
  /** Optional value accessor for sorting/searching when key isn't a direct field. */
  accessor?: (row: T) => string | number | null
  /** Whether this column is sortable. Defaults to true. */
  sortable?: boolean
  /** Whether this column is searchable. Defaults to true. */
  searchable?: boolean
  /** Hide on small screens. */
  hideOnMobile?: boolean
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  /** Unique row identifier. */
  getRowId: (row: T) => string
  /** Page size. Defaults to 10. */
  pageSize?: number
  /** Enable client-side search across searchable columns. */
  searchable?: boolean
  searchPlaceholder?: string
  /** Enable row selection + bulk actions. */
  enableSelection?: boolean
  /** Render bulk-action buttons when rows are selected. */
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode
  /** Empty-state message. */
  emptyMessage?: string
  loading?: boolean
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search…',
  enableSelection = false,
  bulkActions,
  emptyMessage = 'No records found.',
  loading = false,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset to first page when search changes.
  React.useEffect(() => {
    setPage(1)
  }, [search])

  const searchableColumns = useMemo(
    () => columns.filter((c) => c.searchable !== false),
    [columns],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const term = search.toLowerCase().trim()
    return data.filter((row) =>
      searchableColumns.some((col) => {
        const val = col.accessor
          ? col.accessor(row)
          : (row as Record<string, unknown>)[col.key]
        return val != null && String(val).toLowerCase().includes(term)
      }),
    )
  }, [data, search, searchableColumns])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return filtered
    const getVal = (row: T): string | number => {
      const v = col.accessor
        ? col.accessor(row)
        : (row as Record<string, unknown>)[col.key]
      if (v == null) return ''
      return typeof v === 'number' ? v : String(v)
    }
    return [...filtered].sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, currentPage, pageSize])

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else if (sortDir === 'desc') {
      setSortKey(null)
      setSortDir(null)
    } else {
      setSortDir('asc')
    }
  }

  const allOnPageSelected =
    paged.length > 0 && paged.every((r) => selected.has(getRowId(r)))
  const someOnPageSelected =
    paged.some((r) => selected.has(getRowId(r))) && !allOnPageSelected

  const toggleSelectAllOnPage = () => {
    const next = new Set(selected)
    if (allOnPageSelected) {
      paged.forEach((r) => next.delete(getRowId(r)))
    } else {
      paged.forEach((r) => next.add(getRowId(r)))
    }
    setSelected(next)
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const clearSelection = () => setSelected(new Set())

  const selectedIds = Array.from(selected)

  return (
    <div className={cn('w-full', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {searchable && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}
        <div className="flex-1" />
        {enableSelection && selectedIds.length > 0 && bulkActions && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedIds.length} selected
            </span>
            {bulkActions(selectedIds, clearSelection)}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              {enableSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      allOnPageSelected
                        ? true
                        : someOnPageSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label="Select all on page"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.className,
                  )}
                >
                  {col.sortable === false ? (
                    col.header
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : sortDir === 'desc' ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="text-center py-12"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="text-center py-12"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Inbox className="h-8 w-8 text-gray-300" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => {
                const id = getRowId(row)
                const isSelected = selected.has(id)
                return (
                  <TableRow
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-blue-50/50',
                    )}
                  >
                    {enableSelection && (
                      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(id)}
                          aria-label="Select row"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          col.hideOnMobile && 'hidden md:table-cell',
                          col.className,
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? '',
                            )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing{' '}
            {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-gray-600 px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
