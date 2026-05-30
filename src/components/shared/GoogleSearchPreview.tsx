import React from 'react'

interface GoogleSearchPreviewProps {
  /** The page title as it would appear in Google search results */
  title: string
  /** The URL-friendly slug */
  slug: string
  /** The meta description */
  description: string
  /** Base domain for the breadcrumb */
  baseDomain?: string
  /** The section/path segment — REQUIRED, must adapt per content type: 'update' | 'pdf' | 'tool' */
  section: string
}

/**
 * GoogleSearchPreview
 *
 * Renders a visual mockup of how the page would appear in Google Search results.
 * Binds reactively to the admin's manual SEO inputs for real-time preview.
 *
 * Google's display limits:
 * - Title: ~60 characters (truncated with "…" if exceeded)
 * - Description: ~160 characters (truncated with "…" if exceeded)
 *
 * Visual feedback:
 * - 🔴 Red border + badge when a field is completely empty
 * - 🟠 Amber badge when a field exceeds truncation limits
 * - 🟢 Green badge when a field is within recommended limits
 */
const GoogleSearchPreview: React.FC<GoogleSearchPreviewProps> = ({
  title,
  slug,
  description,
  baseDomain = 'edudock.in',
  section,
}) => {
  const TITLE_MAX = 60
  const DESC_MAX = 160

  const truncateTitle =
    title.length > TITLE_MAX ? title.slice(0, TITLE_MAX).trimEnd() + '…' : title
  const truncateDesc =
    description.length > DESC_MAX
      ? description.slice(0, DESC_MAX).trimEnd() + '…'
      : description

  const hasTitle = title.trim().length > 0
  const hasDescription = description.trim().length > 0

  const titleExceeded = title.length > TITLE_MAX
  const descExceeded = description.length > DESC_MAX

  const displayTitle = truncateTitle || 'Untitled'
  const displaySlug = slug || 'untitled-slug'
  const displayDesc = truncateDesc || 'No description provided.'

  // Build breadcrumb: edudock.in > [section] > [slug]
  const breadcrumb = `${baseDomain} > ${section} > ${displaySlug}`

  // Status indicators for each field
  const titleStatus = !hasTitle ? 'empty' : titleExceeded ? 'truncated' : 'ok'
  const descStatus = !hasDescription ? 'empty' : descExceeded ? 'truncated' : 'ok'

  const statusBadge = (status: 'empty' | 'truncated' | 'ok') => {
    switch (status) {
      case 'empty':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Missing
          </span>
        )
      case 'truncated':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Truncated
          </span>
        )
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Good
          </span>
        )
    }
  }

  const borderClass = !hasTitle || !hasDescription
    ? 'border-red-300 bg-red-50/30'
    : 'border-gray-200 bg-white'

  return (
    <div className={`w-full max-w-[600px] rounded-md border ${borderClass} p-4 shadow-sm transition-colors duration-300`}>
      {/* Header label with status badges */}
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Google Search Preview
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          Live
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {statusBadge(titleStatus)}
          {statusBadge(descStatus)}
        </div>
      </div>

      {/* Google-style result card */}
      <div className="font-sans">
        {/* Clickable blue title link */}
        <a
          href="#"
          className={`text-lg leading-tight hover:underline cursor-pointer transition-colors ${
            !hasTitle ? 'text-gray-400' : 'text-[#1a0dab]'
          }`}
          style={{ fontFamily: 'Arial, sans-serif' }}
          onClick={(e) => e.preventDefault()}
        >
          {displayTitle}
        </a>

        {/* URL breadcrumb in gray/green */}
        <div
          className="text-sm leading-tight text-[#006621] mt-0.5"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {breadcrumb}
        </div>

        {/* Description snippet in dark gray */}
        <p
          className={`text-sm leading-snug mt-0.5 transition-colors ${
            !hasDescription ? 'text-gray-400' : 'text-[#545454]'
          }`}
          style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.4' }}
        >
          {displayDesc}
        </p>
      </div>

      {/* Character count indicators */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
        <span>
          Title: <strong className={titleExceeded ? 'text-amber-600' : 'text-gray-600'}>{title.length}</strong>/{TITLE_MAX}
        </span>
        <span>
          Desc: <strong className={descExceeded ? 'text-amber-600' : 'text-gray-600'}>{description.length}</strong>/{DESC_MAX}
        </span>
      </div>
    </div>
  )
}

export default GoogleSearchPreview