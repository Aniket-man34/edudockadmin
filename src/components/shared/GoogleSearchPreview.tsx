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
  /** The section/path segment */
  section?: string
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
 */
const GoogleSearchPreview: React.FC<GoogleSearchPreviewProps> = ({
  title,
  slug,
  description,
  baseDomain = 'edudock.in',
  section = 'update',
}) => {
  const TITLE_MAX = 60
  const DESC_MAX = 160

  const truncateTitle =
    title.length > TITLE_MAX ? title.slice(0, TITLE_MAX).trimEnd() + '…' : title
  const truncateDesc =
    description.length > DESC_MAX
      ? description.slice(0, DESC_MAX).trimEnd() + '…'
      : description

  const displayTitle = truncateTitle || 'Untitled Update'
  const displaySlug = slug || 'untitled-slug'
  const displayDesc = truncateDesc || 'No description provided.'

  // Build breadcrumb: edudock.in > update > [slug]
  const breadcrumb = `${baseDomain} > ${section} > ${displaySlug}`

  return (
    <div className="w-full max-w-[600px] rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header label */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Google Search Preview
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          Live
        </span>
      </div>

      {/* Google-style result card */}
      <div className="font-sans">
        {/* Clickable blue title link */}
        <a
          href="#"
          className="text-lg leading-tight text-[#1a0dab] hover:underline cursor-pointer"
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
          className="text-sm leading-snug text-[#545454] mt-0.5"
          style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.4' }}
        >
          {displayDesc}
        </p>
      </div>
    </div>
  )
}

export default GoogleSearchPreview