import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, XCircle, ClipboardCheck } from 'lucide-react'

export type PublishingSection = 'updates' | 'tools' | 'pdfs'

export interface PublishingChecklistProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: PublishingSection
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  schemaMarkup: string
  hasImage: boolean
  slugError: string
  schemaMarkupError: string
  isEditMode: boolean
  onConfirm: () => void
  onCancel: () => void
}

interface ChecklistItem {
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

const sectionLabels: Record<PublishingSection, string> = {
  updates: 'Update',
  tools: 'Tool',
  pdfs: 'PDF',
}

const PublishingChecklistModal: React.FC<PublishingChecklistProps> = ({
  open,
  onOpenChange,
  section,
  title,
  slug,
  metaTitle,
  metaDescription,
  schemaMarkup,
  hasImage,
  slugError,
  schemaMarkupError,
  isEditMode,
  onConfirm,
  onCancel,
}) => {
  const trimmedMetaTitle = metaTitle.trim()
  const trimmedMetaDescription = metaDescription.trim()
  const trimmedSlug = slug.trim()
  const trimmedSchemaMarkup = schemaMarkup.trim()

  // --- Validate each checklist item ---

  // 1. Title (always required, checked for context)
  const titleStatus: ChecklistItem['status'] = title.trim() ? 'pass' : 'fail'
  const titleDetail = title.trim()
    ? 'Title is present'
    : 'Title is required before publishing'

  // 2. Meta Title
  let metaTitleStatus: ChecklistItem['status'] = 'fail'
  let metaTitleDetail = 'Meta title is missing — search engines will auto-generate one'
  if (trimmedMetaTitle) {
    if (trimmedMetaTitle.length <= 60) {
      metaTitleStatus = 'pass'
      metaTitleDetail = `${trimmedMetaTitle.length}/60 characters — optimal length`
    } else {
      metaTitleStatus = 'warn'
      metaTitleDetail = `${trimmedMetaTitle.length}/60 characters — may be truncated in search results`
    }
  }

  // 3. Meta Description
  let metaDescStatus: ChecklistItem['status'] = 'fail'
  let metaDescDetail = 'Meta description is missing — search engines will auto-generate one'
  if (trimmedMetaDescription) {
    if (trimmedMetaDescription.length <= 160) {
      metaDescStatus = 'pass'
      metaDescDetail = `${trimmedMetaDescription.length}/160 characters — optimal length`
    } else {
      metaDescStatus = 'warn'
      metaDescDetail = `${trimmedMetaDescription.length}/160 characters — may be truncated in search results`
    }
  }

  // 4. Slug
  let slugStatus: ChecklistItem['status'] = 'fail'
  let slugDetail = 'Slug is missing — will be auto-generated from the title'
  if (trimmedSlug) {
    if (slugError) {
      slugStatus = 'fail'
      slugDetail = slugError
    } else {
      slugStatus = 'pass'
      slugDetail = `Slug: "${trimmedSlug}" — valid format`
    }
  }

  // 5. Schema Markup
  let schemaStatus: ChecklistItem['status'] = 'pass'
  let schemaDetail = 'No schema markup provided (optional)'
  if (trimmedSchemaMarkup) {
    if (schemaMarkupError) {
      schemaStatus = 'fail'
      schemaDetail = `Invalid JSON: ${schemaMarkupError.replace('Invalid JSON: ', '')}`
    } else {
      schemaStatus = 'pass'
      schemaDetail = 'Schema markup is valid JSON'
    }
  }

  // 6. Image / Cover
  let imageStatus: ChecklistItem['status'] = hasImage ? 'pass' : 'fail'
  let imageDetail = hasImage
    ? section === 'tools'
      ? 'Tool image is present'
      : 'Cover image is present'
    : section === 'tools'
      ? 'No tool image uploaded — visual appearance may suffer'
      : 'No cover image uploaded — visual appearance may suffer'

  const items: ChecklistItem[] = [
    { label: 'Title', status: titleStatus, detail: titleDetail },
    { label: 'Meta Title (SEO)', status: metaTitleStatus, detail: metaTitleDetail },
    { label: 'Meta Description (SEO)', status: metaDescStatus, detail: metaDescDetail },
    { label: 'URL Slug', status: slugStatus, detail: slugDetail },
    { label: 'Schema Markup (Rich Snippets)', status: schemaStatus, detail: schemaDetail },
    { label: section === 'tools' ? 'Tool Image' : 'Cover Image', status: imageStatus, detail: imageDetail },
  ]

  const failCount = items.filter((i) => i.status === 'fail').length
  const warnCount = items.filter((i) => i.status === 'warn').length
  const passCount = items.filter((i) => i.status === 'pass').length

  const statusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      case 'warn':
        return <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
    }
  }

  const statusBg = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200'
      case 'warn':
        return 'bg-amber-50 border-amber-200'
      case 'fail':
        return 'bg-red-50 border-red-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-500" />
            Publishing Checklist — {sectionLabels[section]}
          </DialogTitle>
          <DialogDescription>
            Review the SEO readiness of this {sectionLabels[section].toLowerCase()} before{' '}
            {isEditMode ? 'saving changes' : 'publishing'}.
          </DialogDescription>
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex items-center gap-3 text-sm mb-1">
          <span className="flex items-center gap-1 text-green-700 font-medium">
            <CheckCircle className="h-4 w-4" /> {passCount}
          </span>
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <AlertTriangle className="h-4 w-4" /> {warnCount}
            </span>
          )}
          {failCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <XCircle className="h-4 w-4" /> {failCount}
            </span>
          )}
          <span className="text-muted-foreground ml-auto">
            {passCount}/{items.length} checks passed
          </span>
        </div>

        {/* Checklist items */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${statusBg(item.status)}`}
            >
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    item.status === 'pass'
                      ? 'text-green-800'
                      : item.status === 'warn'
                        ? 'text-amber-800'
                        : 'text-red-800'
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Warning banner if there are failures */}
        {failCount > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>{failCount} issue{failCount > 1 ? 's' : ''}</strong> detected.
              You can still {isEditMode ? 'save' : 'publish'}, but search engine visibility may be impacted.
            </span>
          </div>
        )}

        {failCount === 0 && warnCount === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>All checks passed!</strong> This {sectionLabels[section].toLowerCase()} is
              ready for {isEditMode ? 'saving' : 'publishing'}.
            </span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Go Back & Fix
          </Button>
          <Button
            onClick={onConfirm}
            variant={failCount > 0 ? 'outline' : 'default'}
            className={
              failCount === 0 && warnCount === 0
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : ''
            }
          >
            {isEditMode ? 'Save Anyway' : 'Publish Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PublishingChecklistModal