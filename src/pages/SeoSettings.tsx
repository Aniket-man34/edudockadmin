import React, { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, Globe, Code2, FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import GoogleSearchPreview from '@/components/shared/GoogleSearchPreview'
import { useToast } from '@/hooks/use-toast'
import { supabase, TABLES } from '@/lib/supabase'
import type { SiteSeoSettings } from '@/types/seo'

const META_TITLE_MAX = 60
const META_DESC_MAX = 160

/**
 * Pre-built JSON-LD template for an Educational Organization / Website.
 * Provides a starting point that admins can customize.
 */
const ORGANIZATION_SCHEMA_TEMPLATE = JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'EduDock',
    url: 'https://edudock.in',
    description: 'Your educational platform description here.',
    sameAs: [
      'https://twitter.com/edudock',
      'https://linkedin.com/company/edudock',
    ],
  },
  null,
  2
)

const SeoSettings: React.FC = () => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  // Form fields
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [schemaMarkup, setSchemaMarkup] = useState('')
  const [schemaError, setSchemaError] = useState('')

  // Fetch existing 'home' settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from(TABLES.SEO_SETTINGS)
        .select('*')
        .eq('page_name', 'home')
        .maybeSingle()

      if (error) throw error

      if (data) {
        const row = data as SiteSeoSettings
        setSettingsId(row.id)
        setMetaTitle(row.meta_title ?? '')
        setMetaDescription(row.meta_description ?? '')
        setSchemaMarkup(
          row.schema_markup
            ? JSON.stringify(row.schema_markup, null, 2)
            : ''
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load SEO settings'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Validate JSON-LD on blur
  const validateSchema = useCallback(() => {
    const trimmed = schemaMarkup.trim()
    if (!trimmed) {
      setSchemaError('')
      return true
    }
    try {
      JSON.parse(trimmed)
      setSchemaError('')
      return true
    } catch {
      setSchemaError('Invalid JSON-LD syntax. Check brackets and quotes.')
      return false
    }
  }, [schemaMarkup])

  // Upsert: update if we have an id, insert otherwise
  const handleSave = async () => {
    // Validate JSON before saving
    if (schemaMarkup.trim() && !validateSchema()) {
      toast({
        title: 'Invalid JSON-LD',
        description: 'Please fix the JSON syntax before saving.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      let parsedSchema: Record<string, unknown> | null = null
      if (schemaMarkup.trim()) {
        parsedSchema = JSON.parse(schemaMarkup.trim()) as Record<string, unknown>
      }

      const payload = {
        page_name: 'home',
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        schema_markup: parsedSchema,
      }

      if (settingsId) {
        // Update existing row
        const { error } = await supabase
          .from(TABLES.SEO_SETTINGS)
          .update(payload)
          .eq('id', settingsId)

        if (error) throw error
      } else {
        // Insert new row
        const { data, error } = await supabase
          .from(TABLES.SEO_SETTINGS)
          .insert(payload)
          .select('id')
          .single()

        if (error) throw error
        if (data) setSettingsId((data as SiteSeoSettings).id)
      }

      toast({
        title: 'SEO Settings Saved',
        description: 'Homepage meta data has been updated successfully.',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save SEO settings'
      toast({ title: 'Save Failed', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Character count helpers
  const titleCharsLeft = META_TITLE_MAX - metaTitle.length
  const descCharsLeft = META_DESC_MAX - metaDescription.length

  const titleCountColor =
    titleCharsLeft < 0
      ? 'text-red-600'
      : titleCharsLeft <= 10
        ? 'text-amber-600'
        : 'text-gray-400'

  const descCountColor =
    descCharsLeft < 0
      ? 'text-red-600'
      : descCharsLeft <= 20
        ? 'text-amber-600'
        : 'text-gray-400'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading SEO settings…</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">SEO Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage homepage meta tags and structured data for search engines.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column — Input Fields */}
        <div className="space-y-6">
          {/* Page indicator */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <Globe className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-blue-800">Editing: Homepage</span>
              <span className="text-xs text-blue-600 ml-2">
                ({window.location.origin}/)
              </span>
            </div>
          </div>

          {/* Meta Title */}
          <div className="space-y-1">
            <Label htmlFor="seo-meta-title" className="flex items-center justify-between">
              <span>Meta Title</span>
              <span className={`text-xs font-mono tabular-nums ${titleCountColor}`}>
                {titleCharsLeft}
              </span>
            </Label>
            <Input
              id="seo-meta-title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="EduDock — Your Educational Platform"
              maxLength={META_TITLE_MAX + 20}
              className={titleCharsLeft < 0 ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Recommended: 50–60 characters for Google display.
              </p>
              <div className="flex items-center gap-1">
                {/* Visual progress bar */}
                <div className="h-1.5 w-32 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      titleCharsLeft < 0
                        ? 'bg-red-500'
                        : titleCharsLeft <= 10
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (metaTitle.length / META_TITLE_MAX) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {metaTitle.length}/{META_TITLE_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Meta Description */}
          <div className="space-y-1">
            <Label htmlFor="seo-meta-desc" className="flex items-center justify-between">
              <span>Meta Description</span>
              <span className={`text-xs font-mono tabular-nums ${descCountColor}`}>
                {descCharsLeft}
              </span>
            </Label>
            <Textarea
              id="seo-meta-desc"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="EduDock is a comprehensive educational platform offering PDFs, tools, and the latest academic updates for students and educators."
              rows={4}
              maxLength={META_DESC_MAX + 20}
              className={`resize-none ${descCharsLeft < 0 ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Recommended: 150–160 characters for Google display.
              </p>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-32 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      descCharsLeft < 0
                        ? 'bg-red-500'
                        : descCharsLeft <= 20
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (metaDescription.length / META_DESC_MAX) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {metaDescription.length}/{META_DESC_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* JSON-LD Schema Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-schema" className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-gray-500" />
                JSON-LD Schema Markup
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSchemaMarkup(ORGANIZATION_SCHEMA_TEMPLATE)
                  setSchemaError('')
                }}
                className="text-xs h-8"
              >
                <FileCode2 className="mr-1 h-3.5 w-3.5" />
                Use Organization Template
              </Button>
            </div>
            <Textarea
              id="seo-schema"
              value={schemaMarkup}
              onChange={(e) => {
                setSchemaMarkup(e.target.value)
                if (schemaError) setSchemaError('')
              }}
              onBlur={validateSchema}
              placeholder={`Paste your JSON-LD schema here, e.g.:\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  ...\n}`}
              rows={12}
              className={`resize-y font-mono text-sm ${
                schemaError ? 'border-red-400 focus-visible:ring-red-400' : ''
              }`}
              spellCheck={false}
            />
            {schemaError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {schemaError}
              </p>
            )}
            {!schemaError && schemaMarkup.trim() && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Valid JSON-LD
              </p>
            )}
            <p className="text-xs text-gray-400">
              This structured data helps Google understand your site and may enable rich results
              (sitelinks searchbox, organization knowledge panel, etc.).
            </p>
          </div>
        </div>

        {/* Right Column — Live Google Search Preview */}
        <div className="lg:sticky lg:top-6 self-start">
          <GoogleSearchPreview
            title={metaTitle || 'EduDock — Your Educational Platform'}
            slug=""
            description={metaDescription}
            section="home"
          />
          <p className="mt-3 text-xs text-gray-400 text-center">
            This is how your homepage may appear in Google Search results.
            Fill in the fields on the left to see the preview update in real time.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SeoSettings