import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Save,
  Calendar,
  History,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import RichTextEditor from './RichTextEditor'
import { useAutosave } from '@/hooks/useAutosave'
import { saveRevision, fetchRevisions, type ContentRevision, type RevisionEntityType } from '@/lib/revisions'
import { logActivity } from '@/lib/activityLog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export type ContentStatus = 'draft' | 'published' | 'archived'

export interface UniversalContentEditorProps {
  /** Existing content id, or null for a new item. */
  contentId: string | null
  entityType: RevisionEntityType
  /** Initial title. */
  initialTitle: string
  /** Initial markdown content. */
  initialContent: string
  /** Initial status. */
  initialStatus: ContentStatus
  /** Initial scheduled-at ISO string, or null. */
  initialScheduledAt: string | null
  /** Persist the content. Receives the full payload, returns the (possibly new) id. */
  onSave: (payload: ContentPayload) => Promise<string>
  /** Optional: called when the user requests to view the live page. */
  onViewLive?: () => void
  /** Storage bucket for image uploads in the rich text editor. */
  imageBucket?: string
  /** Display label for the entity type, e.g. "Update". */
  entityLabel: string
}

export interface ContentPayload {
  id: string | null
  title: string
  content: string
  status: ContentStatus
  scheduled_at: string | null
}

const AUTOSAVE_DELAY = 4000

const UniversalContentEditor: React.FC<UniversalContentEditorProps> = ({
  contentId,
  entityType,
  initialTitle,
  initialContent,
  initialStatus,
  initialScheduledAt,
  onSave,
  onViewLive,
  imageBucket,
  entityLabel,
}) => {
  const { toast } = useToast()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState<ContentStatus>(initialStatus)
  const [scheduledAt, setScheduledAt] = useState<string>(
    initialScheduledAt ? toLocalDatetime(initialScheduledAt) : '',
  )
  const [saving, setSaving] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showRevisions, setShowRevisions] = useState(false)
  const [revisions, setRevisions] = useState<ContentRevision[]>([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<ContentRevision | null>(null)

  // Track whether there are unsaved changes (for the manual Save button).
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    setDirty(true)
  }, [title, content, status, scheduledAt])

  // Reset state when switching to a different content item.
  useEffect(() => {
    setTitle(initialTitle)
    setContent(initialContent)
    setStatus(initialStatus)
    setScheduledAt(initialScheduledAt ? toLocalDatetime(initialScheduledAt) : '')
    setDirty(false)
  }, [contentId, initialTitle, initialContent, initialStatus, initialScheduledAt])

  const storageKey = contentId
    ? `edudock:draft:${entityType}:${contentId}`
    : `edudock:draft:${entityType}:new`

  const buildPayload = useCallback(
    (override?: Partial<ContentPayload>): ContentPayload => ({
      id: contentId,
      title: title.trim(),
      content,
      status,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      ...override,
    }),
    [contentId, title, content, status, scheduledAt],
  )

  const doSave = useCallback(
    async (payload: ContentPayload) => {
      if (!payload.title.trim()) {
        toast({
          title: 'Title required',
          description: 'Enter a title before saving.',
          variant: 'destructive',
        })
        return
      }
      setSaving(true)
      try {
        const newId = await onSave(payload)
        // Save a revision snapshot if we have an id.
        const idForRevision = newId || contentId
        if (idForRevision) {
          await saveRevision(entityType, idForRevision, {
            title: payload.title,
            content: payload.content,
            status: payload.status,
            scheduled_at: payload.scheduled_at,
          })
        }
        await logActivity({
          action: payload.status === 'published' ? 'publish' : 'edit',
          entity_type: entityType,
          entity_id: idForRevision ?? '',
          entity_title: payload.title,
          metadata: { status: payload.status, scheduled: !!payload.scheduled_at },
        })
        setDirty(false)
        toast({
          title: 'Saved',
          description: `${entityLabel} "${payload.title}" saved successfully.`,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Save failed'
        toast({ title: 'Save failed', description: msg, variant: 'destructive' })
        throw e
      } finally {
        setSaving(false)
      }
    },
    [contentId, entityType, entityLabel, onSave, toast],
  )

  // Autosave only when there's an existing id (not for brand-new items).
  const autosaveValue = useMemo(
    () => JSON.stringify({ title, content, status, scheduledAt }),
    [title, content, status, scheduledAt],
  )

  const { status: autosaveStatus, lastSavedAt, saveNow, loadDraft, clearDraft } =
    useAutosave(
      autosaveValue,
      async () => {
        if (!contentId) return // don't autosave new items
        await doSave(buildPayload())
      },
      { delayMs: AUTOSAVE_DELAY, enabled: !!contentId, storageKey },
    )

  // Offer to restore a draft on mount if one exists.
  useEffect(() => {
    if (!contentId) return
    const draft = loadDraft()
    if (draft && draft !== autosaveValue) {
      // Only prompt if the draft differs from current state.
      // We use a lightweight confirm to avoid blocking.
      const restore = window.confirm(
        `An unsaved draft was found for this ${entityLabel}. Restore it?`,
      )
      if (restore) {
        try {
          const parsed = JSON.parse(draft) as {
            title: string
            content: string
            status: ContentStatus
            scheduledAt: string
          }
          setTitle(parsed.title)
          setContent(parsed.content)
          setStatus(parsed.status)
          setScheduledAt(parsed.scheduledAt)
          toast({ title: 'Draft restored', description: 'Your unsaved changes are back.' })
        } catch {
          // ignore parse errors
        }
      } else {
        clearDraft()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId])

  const handleManualSave = async () => {
    await saveNow()
    if (!contentId) {
      // For new items, autosave is disabled — save directly.
      await doSave(buildPayload())
    }
  }

  const handlePublish = async () => {
    await doSave(buildPayload({ status: 'published', scheduled_at: null }))
    setStatus('published')
    setScheduledAt('')
  }

  const handleUnpublish = async () => {
    await doSave(buildPayload({ status: 'draft' }))
    setStatus('draft')
  }

  const handleSchedule = async () => {
    if (!scheduledAt) {
      toast({
        title: 'Pick a date',
        description: 'Choose when to publish this content.',
        variant: 'destructive',
      })
      return
    }
    const when = new Date(scheduledAt)
    if (when.getTime() <= Date.now()) {
      toast({
        title: 'Invalid date',
        description: 'Scheduled time must be in the future.',
        variant: 'destructive',
      })
      return
    }
    await doSave(buildPayload({ status: 'draft', scheduled_at: when.toISOString() }))
    await logActivity({
      action: 'schedule',
      entity_type: entityType,
      entity_id: contentId ?? '',
      entity_title: title,
      metadata: { scheduled_at: when.toISOString() },
    })
    setShowSchedule(false)
    toast({
      title: 'Scheduled',
      description: `Will publish on ${when.toLocaleString()}.`,
    })
  }

  const openRevisions = async () => {
    setShowRevisions(true)
    if (!contentId) {
      setRevisions([])
      return
    }
    setLoadingRevisions(true)
    try {
      const revs = await fetchRevisions(entityType, contentId, 30)
      setRevisions(revs)
    } finally {
      setLoadingRevisions(false)
    }
  }

  const confirmRestore = async () => {
    if (!restoreTarget) return
    const snap = restoreTarget.content as {
      title?: string
      content?: string
      status?: ContentStatus
      scheduled_at?: string | null
    }
    if (snap.title) setTitle(snap.title)
    if (typeof snap.content === 'string') setContent(snap.content)
    if (snap.status) setStatus(snap.status)
    if (snap.scheduled_at !== undefined) {
      setScheduledAt(snap.scheduled_at ? toLocalDatetime(snap.scheduled_at) : '')
    }
    setRestoreTarget(null)
    setShowRevisions(false)
    toast({
      title: 'Revision loaded',
      description: 'Review and save to apply this revision.',
    })
  }

  const autosaveLabel =
    autosaveStatus === 'saving'
      ? 'Saving…'
      : autosaveStatus === 'saved'
        ? lastSavedAt
          ? `Saved ${lastSavedAt.toLocaleTimeString()}`
          : 'Saved'
        : autosaveStatus === 'error'
          ? 'Autosave failed — draft stored locally'
          : contentId
            ? 'Autosave on'
            : 'Save to enable autosave'

  return (
    <div className="space-y-4">
      {/* Top bar: title + actions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${entityLabel} title…`}
            className="text-lg font-semibold h-11 flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>

        {/* Status + autosave indicator */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium',
              status === 'published'
                ? 'bg-green-50 text-green-700'
                : status === 'draft'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-100 text-gray-600',
            )}
          >
            {status === 'published' ? (
              <Eye className="h-3 w-3" />
            ) : status === 'draft' ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {status}
          </span>
          {scheduledAt && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              <Clock className="h-3 w-3" />
              {new Date(scheduledAt).toLocaleString()}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {autosaveStatus === 'saving' && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {autosaveStatus === 'saved' && <Check className="h-3 w-3 text-green-500" />}
            {autosaveStatus === 'error' && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
            {autosaveLabel}
          </span>
        </div>
      </div>

      {/* Rich text editor */}
      <RichTextEditor
        value={content}
        onChange={setContent}
        imageBucket={imageBucket}
        height={500}
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        {status !== 'published' && (
          <Button onClick={handlePublish} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Publish now
          </Button>
        )}
        {status === 'published' && (
          <Button variant="outline" onClick={handleUnpublish} disabled={saving}>
            <EyeOff className="h-4 w-4" />
            Unpublish
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowSchedule(true)}>
          <Calendar className="h-4 w-4" />
          Schedule
        </Button>
        <Button variant="outline" onClick={openRevisions} disabled={!contentId}>
          <History className="h-4 w-4" />
          Revisions
        </Button>
        {onViewLive && (
          <Button variant="ghost" onClick={onViewLive}>
            <Eye className="h-4 w-4" />
            View live
          </Button>
        )}
      </div>

      {/* Schedule dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule publishing
            </DialogTitle>
            <DialogDescription>
              Pick a date and time. The content will be published automatically
              at that time (requires a scheduled-publishing worker or cron).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="schedule-at">Publish at</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Current time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={saving || !scheduledAt}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisions dialog */}
      <Dialog open={showRevisions} onOpenChange={setShowRevisions}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Revision history
            </DialogTitle>
            <DialogDescription>
              Restore a previous version. Restoring loads it into the editor —
              you must save to apply it.
            </DialogDescription>
          </DialogHeader>
          {loadingRevisions ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading revisions…
            </div>
          ) : revisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm">
                {contentId
                  ? 'No revisions saved yet. Revisions are created automatically when you save.'
                  : 'Save the content first to start tracking revisions.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {revisions.map((rev) => {
                const snap = rev.content as {
                  title?: string
                  status?: string
                }
                return (
                  <li
                    key={rev.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {snap.title ?? '(untitled)'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(rev.created_at).toLocaleString()}
                        {rev.author_name ? ` · ${rev.author_name}` : ''}
                        {snap.status ? ` · ${snap.status}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(rev)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevisions(false)}>
              <X className="h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirm */}
      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Restore this revision?
            </DialogTitle>
            <DialogDescription>
              This will replace the current editor content with the selected
              revision. Your unsaved changes will be lost. You can still review
              and save before publishing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRestore}>
              <RotateCcw className="h-4 w-4" />
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Convert an ISO string to a value suitable for <input type="datetime-local">. */
function toLocalDatetime(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export default UniversalContentEditor
