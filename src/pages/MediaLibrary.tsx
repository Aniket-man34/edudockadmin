import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Image as ImageIcon,
  FileText,
  Upload,
  Search,
  Trash2,
  Copy,
  Pencil,
  Loader2,
  Check,
  X,
  FolderOpen,
  AlertCircle,
  Link2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { cn } from '@/lib/utils'

/** A single file entry returned by Supabase storage .list(). */
interface StorageFile {
  id: string // `${bucket}/${path}`
  name: string
  bucket: string
  path: string // full path within bucket
  size: number | null
  mimeType: string | null
  updatedAt: string | null
  publicUrl: string
}

interface BucketMeta {
  id: string
  label: string
  accept: string
  isImage: boolean
}

const BUCKETS: BucketMeta[] = [
  { id: STORAGE_BUCKETS.PDF_COVERS, label: 'PDF Covers', accept: 'image/*', isImage: true },
  { id: STORAGE_BUCKETS.UPDATE_IMAGES, label: 'Update Images', accept: 'image/*', isImage: true },
  { id: STORAGE_BUCKETS.TOOL_IMAGES, label: 'Tool Images', accept: 'image/*', isImage: true },
  { id: STORAGE_BUCKETS.PDF_FILES, label: 'PDF Files', accept: 'application/pdf', isImage: false },
]

const PAGE_SIZE = 24

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageMime(mime: string | null, name: string): boolean {
  if (mime) return mime.startsWith('image/')
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name)
}

const MediaLibrary: React.FC = () => {
  const { toast } = useToast()
  const [activeBucket, setActiveBucket] = useState<string>(BUCKETS[0].id)
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renameTarget, setRenameTarget] = useState<StorageFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StorageFile | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const bucketMeta = BUCKETS.find((b) => b.id === activeBucket)!

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from(activeBucket)
        .list('', {
          limit: PAGE_SIZE + 1,
          offset: (page - 1) * PAGE_SIZE,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) {
        throw new Error(error.message)
      }

      const items = (data ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder')
      const hasMoreFlag = items.length > PAGE_SIZE
      const visible = hasMoreFlag ? items.slice(0, PAGE_SIZE) : items

      const mapped: StorageFile[] = visible.map((f) => {
        const path = f.name
        const { data: pub } = supabase.storage
          .from(activeBucket)
          .getPublicUrl(path)
        return {
          id: `${activeBucket}/${path}`,
          name: f.name,
          bucket: activeBucket,
          path,
          size: (f.metadata as { size?: number } | null)?.size ?? null,
          mimeType:
            (f.metadata as { mimetype?: string } | null)?.mimetype ?? null,
          updatedAt: f.updated_at ?? null,
          publicUrl: pub.publicUrl,
        }
      })

      setFiles(mapped)
      setHasMore(hasMoreFlag)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load files'
      toast({ title: 'Load failed', description: msg, variant: 'destructive' })
      setFiles([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [activeBucket, page, toast])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Reset page + selection when switching buckets.
  const switchBucket = (id: string) => {
    setActiveBucket(id)
    setPage(1)
    setSelected(new Set())
    setSearch('')
  }

  const filtered = search.trim()
    ? files.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase().trim()),
      )
    : files

  const handleUpload = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (arr.length === 0) return
    setUploading(true)
    let success = 0
    let failed = 0

    for (const file of arr) {
      // Sanitize filename: keep ASCII alphanumerics, dash, underscore, dot.
      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
      const uniqueName = `${Date.now()}-${safeName}`

      const { error } = await supabase.storage
        .from(activeBucket)
        .upload(uniqueName, file, { upsert: false })

      if (error) {
        failed++
        console.error('Upload error:', file.name, error.message)
      } else {
        success++
        await logActivity({
          action: 'create',
          entity_type: 'media',
          entity_id: `${activeBucket}/${uniqueName}`,
          entity_title: file.name,
          metadata: { bucket: activeBucket, size: file.size },
        })
      }
    }

    setUploading(false)
    if (success > 0) {
      toast({
        title: 'Upload complete',
        description: `${success} file${success > 1 ? 's' : ''} uploaded to ${bucketMeta.label}.`,
      })
      setPage(1)
      fetchFiles()
    }
    if (failed > 0) {
      toast({
        title: 'Some uploads failed',
        description: `${failed} file${failed > 1 ? 's' : ''} could not be uploaded.`,
        variant: 'destructive',
      })
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files)
      e.target.value = '' // reset so same file can be re-selected
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const copyUrl = async (file: StorageFile) => {
    try {
      await navigator.clipboard.writeText(file.publicUrl)
      setCopiedId(file.id)
      toast({ title: 'URL copied', description: 'Public URL copied to clipboard.' })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not access clipboard. Copy manually: ' + file.publicUrl,
        variant: 'destructive',
      })
    }
  }

  const confirmRename = async () => {
    if (!renameTarget) return
    const newName = renameValue.trim()
    if (!newName || newName === renameTarget.name) {
      setRenameTarget(null)
      return
    }

    // Sanitize new name.
    const safe = newName
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()

    try {
      const { error } = await supabase.storage
        .from(renameTarget.bucket)
        .move(renameTarget.path, safe)

      if (error) throw new Error(error.message)

      await logActivity({
        action: 'edit',
        entity_type: 'media',
        entity_id: `${renameTarget.bucket}/${safe}`,
        entity_title: safe,
        metadata: {
          bucket: renameTarget.bucket,
          old_name: renameTarget.name,
          new_name: safe,
        },
      })

      toast({
        title: 'Renamed',
        description: `"${renameTarget.name}" → "${safe}".`,
      })
      setRenameTarget(null)
      fetchFiles()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Rename failed'
      toast({ title: 'Rename failed', description: msg, variant: 'destructive' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error } = await supabase.storage
        .from(deleteTarget.bucket)
        .remove([deleteTarget.path])

      if (error) throw new Error(error.message)

      await logActivity({
        action: 'delete',
        entity_type: 'media',
        entity_id: deleteTarget.id,
        entity_title: deleteTarget.name,
        metadata: { bucket: deleteTarget.bucket },
      })

      toast({
        title: 'Deleted',
        description: `"${deleteTarget.name}" was removed from ${deleteTarget.bucket}.`,
      })
      setDeleteTarget(null)
      // Remove from selection if present.
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      fetchFiles()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed'
      toast({ title: 'Delete failed', description: msg, variant: 'destructive' })
    }
  }

  const confirmBulkDelete = async () => {
    const targets = files.filter((f) => selected.has(f.id))
    if (targets.length === 0) {
      setBulkDeleteOpen(false)
      return
    }

    // Group by bucket (all should be same bucket, but be safe).
    const byBucket = new Map<string, StorageFile[]>()
    for (const t of targets) {
      const arr = byBucket.get(t.bucket) ?? []
      arr.push(t)
      byBucket.set(t.bucket, arr)
    }

    let totalDeleted = 0
    let errors = 0

    for (const [bucket, items] of byBucket) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(items.map((i) => i.path))
      if (error) {
        errors++
        console.error('Bulk delete error:', bucket, error.message)
      } else {
        totalDeleted += items.length
        for (const item of items) {
          await logActivity({
            action: 'delete',
            entity_type: 'media',
            entity_id: item.id,
            entity_title: item.name,
            metadata: { bucket: item.bucket },
          })
        }
      }
    }

    setBulkDeleteOpen(false)
    setSelected(new Set())

    if (totalDeleted > 0) {
      toast({
        title: 'Bulk delete complete',
        description: `${totalDeleted} file${totalDeleted > 1 ? 's' : ''} deleted.`,
      })
    }
    if (errors > 0) {
      toast({
        title: 'Some deletions failed',
        description: `${errors} bucket group${errors > 1 ? 's' : ''} had errors.`,
        variant: 'destructive',
      })
    }
    fetchFiles()
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    const allSelected = filtered.every((f) => selected.has(f.id))
    if (allSelected) {
      // Deselect visible only.
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((f) => next.delete(f.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((f) => next.add(f.id))
        return next
      })
    }
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((f) => selected.has(f.id))

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-gray-400" />
            Media Library
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Upload, browse, rename, and delete files across all storage buckets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Bucket tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            onClick={() => switchBucket(b.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors',
              activeBucket === b.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {b.label}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 md:p-8 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={bucketMeta.accept}
          onChange={onFileInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <div className="p-3 rounded-full bg-white shadow-sm">
              <Upload className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-sm font-medium">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Uploading to <span className="font-medium">{bucketMeta.label}</span> ·{' '}
              {bucketMeta.isImage ? 'Images only' : 'PDF files only'}
            </p>
          </div>
        )}
      </div>

      {/* Toolbar: search + bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files by name…"
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        {filtered.length > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            {allVisibleSelected ? (
              <>
                <CheckSquare className="h-4 w-4" /> Deselect all
              </>
            ) : (
              <>
                <Square className="h-4 w-4" /> Select all
              </>
            )}
          </Button>
        )}
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete {selected.size} selected
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading files…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm font-medium">
            {search ? 'No files match your search.' : 'No files in this bucket yet.'}
          </p>
          {!search && (
            <p className="text-xs text-gray-400 mt-1">
              Upload files using the zone above.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((file) => {
            const isImg = bucketMeta.isImage || isImageMime(file.mimeType, file.name)
            const isSelected = selected.has(file.id)
            return (
              <div
                key={file.id}
                className={cn(
                  'group relative rounded-lg border bg-white overflow-hidden transition-all',
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md',
                )}
              >
                {/* Selection checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelect(file.id)
                  }}
                  className={cn(
                    'absolute top-2 left-2 z-10 p-1 rounded transition-opacity',
                    isSelected
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100',
                  )}
                  aria-label="Select file"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded border-2',
                      isSelected
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white/90 border-gray-300 text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </button>

                {/* Thumbnail */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  {isImg ? (
                    <img
                      src={file.publicUrl}
                      alt={file.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const t = e.currentTarget
                        t.style.display = 'none'
                        const parent = t.parentElement
                        if (parent && !parent.querySelector('.fallback-icon')) {
                          const div = document.createElement('div')
                          div.className = 'fallback-icon'
                          div.innerHTML =
                            '<svg class="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'
                          parent.appendChild(div)
                        }
                      }}
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-gray-300" />
                  )}
                </div>

                {/* Info + actions */}
                <div className="p-2.5">
                  <p
                    className="text-xs font-medium text-gray-900 truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatBytes(file.size)}
                  </p>

                  <div className="flex items-center gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => copyUrl(file)}
                      className="flex-1 inline-flex items-center justify-center p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Copy public URL"
                      aria-label="Copy URL"
                    >
                      {copiedId === file.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameTarget(file)
                        setRenameValue(file.name)
                      }}
                      className="flex-1 inline-flex items-center justify-center p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Rename"
                      aria-label="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={file.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Open in new tab"
                      aria-label="Open"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(file)}
                      className="flex-1 inline-flex items-center justify-center p-1.5 rounded text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && files.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page}
            {hasMore ? '' : ` · end of ${bucketMeta.label}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>
              Enter a new name. Only letters, numbers, dots, dashes, and
              underscores are allowed.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename()
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirm */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete file?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-900">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone. If this file is referenced by
              content, that content may show a broken image/link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete {selected.size} files?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {selected.size} file
              {selected.size > 1 ? 's' : ''} from{' '}
              <span className="font-medium text-gray-900">
                {bucketMeta.label}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              <Trash2 className="h-4 w-4" />
              Delete {selected.size} files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MediaLibrary
