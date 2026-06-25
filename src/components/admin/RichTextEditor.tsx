import React, { useCallback, useRef, useState } from 'react'
import MDEditor, { type ICommand, commands } from '@uiw/react-md-editor'
import rehypeRaw from 'rehype-raw'
import {
  Table as TableIcon,
  Code2,
  Video,
  MessageSquareWarning,
  ImagePlus,
  Loader2,
} from 'lucide-react'
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  /** Storage bucket to upload dropped/pasted images to. Defaults to update-images. */
  imageBucket?: string
  className?: string
}

/**
 * Insert a block of text at the cursor, on its own line.
 * Returns the new full text and the cursor position to restore.
 */
function insertBlock(
  text: string,
  selection: { start: number; end: number },
  block: string,
): { text: string; cursor: number } {
  // Move to start of current line.
  let lineStart = selection.start
  while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--
  const prefix = text.slice(lineStart, selection.start)
  const needsNewlineBefore = prefix.trim().length > 0
  const insert = (needsNewlineBefore ? '\n' : '') + block + '\n'
  const newText = text.slice(0, lineStart) + insert + text.slice(selection.end)
  const cursor = lineStart + insert.length
  return { text: newText, cursor }
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  height = 450,
  imageBucket = STORAGE_BUCKETS.UPDATE_IMAGES,
  className,
}) => {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ---- Custom toolbar commands ----
  // The execute signature is (state, api) where:
  //   state.text        — full editor text
  //   state.selection   — { start, end }
  //   api.textArea      — the underlying HTMLTextAreaElement
  //   api.replaceSelection(text) — replaces selection, returns new TextState

  const cmdTable: ICommand = {
    name: 'edudock-table',
    keyCommand: 'edudockTable',
    value: 'edudockTable',
    buttonProps: { 'aria-label': 'Insert table', title: 'Insert table' },
    icon: <TableIcon className="h-4 w-4" />,
    execute: (state, api) => {
      const block = `| Column A | Column B | Column C |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n`
      const { text, cursor } = insertBlock(state.text, state.selection, block)
      const newState = api.replaceSelection(
        text.slice(state.selection.start, state.selection.end).length === 0
          ? block
          : block,
      )
      // Replace the whole text by selecting all then replacing.
      // Simpler: directly call onChange with computed text and restore cursor.
      void newState
      onChange(text)
      requestAnimationFrame(() => {
        if (api.textArea) {
          api.textArea.focus()
          api.textArea.setSelectionRange(cursor, cursor)
        }
      })
    },
  }

  const cmdCodeBlock: ICommand = {
    name: 'edudock-codeblock',
    keyCommand: 'edudockCodeBlock',
    value: 'edudockCodeBlock',
    buttonProps: { 'aria-label': 'Insert code block', title: 'Code block' },
    icon: <Code2 className="h-4 w-4" />,
    execute: (state, api) => {
      const selected = state.selectedText || 'code here'
      const block = '```js\n' + selected + '\n```\n'
      const { text, cursor } = insertBlock(state.text, state.selection, block)
      onChange(text)
      requestAnimationFrame(() => {
        if (api.textArea) {
          api.textArea.focus()
          api.textArea.setSelectionRange(cursor, cursor)
        }
      })
    },
  }

  const cmdCallout: ICommand = {
    name: 'edudock-callout',
    keyCommand: 'edudockCallout',
    value: 'edudockCallout',
    buttonProps: { 'aria-label': 'Insert callout', title: 'Callout / note' },
    icon: <MessageSquareWarning className="h-4 w-4" />,
    execute: (state, api) => {
      const selected = state.selectedText || 'Important note here'
      // Blockquote with bold "Note:" prefix — renders as a callout via the
      // public MarkdownRenderer's blockquote styling.
      const block = `> **Note:** ${selected}\n`
      const { text, cursor } = insertBlock(state.text, state.selection, block)
      onChange(text)
      requestAnimationFrame(() => {
        if (api.textArea) {
          api.textArea.focus()
          api.textArea.setSelectionRange(cursor, cursor)
        }
      })
    },
  }

  const cmdYoutube: ICommand = {
    name: 'edudock-youtube',
    keyCommand: 'edudockYoutube',
    value: 'edudockYoutube',
    buttonProps: { 'aria-label': 'Insert YouTube embed', title: 'YouTube embed' },
    icon: <Video className="h-4 w-4" />,
    execute: (state, api) => {
      const selected = state.selectedText.trim()
      // Accept either a full URL or just the ID.
      const url = selected || 'https://www.youtube.com/watch?v=VIDEO_ID'
      const block = `[![YouTube video](${url})](${url})\n`
      const { text, cursor } = insertBlock(state.text, state.selection, block)
      onChange(text)
      requestAnimationFrame(() => {
        if (api.textArea) {
          api.textArea.focus()
          api.textArea.setSelectionRange(cursor, cursor)
        }
      })
    },
  }

  const cmdImageUpload: ICommand = {
    name: 'edudock-image-upload',
    keyCommand: 'edudockImageUpload',
    value: 'edudockImageUpload',
    buttonProps: { 'aria-label': 'Upload image', title: 'Upload image' },
    icon: <ImagePlus className="h-4 w-4" />,
    execute: () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = false
      input.onchange = async () => {
        if (input.files && input.files[0]) {
          await uploadAndInsert(input.files[0])
        }
      }
      input.click()
    },
  }

  // ---- Image upload (drag&drop + paste + button) ----

  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Not an image',
          description: 'Only image files can be inserted.',
          variant: 'destructive',
        })
        return
      }
      setUploading(true)
      try {
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-')
          .toLowerCase()
        const uniqueName = `${Date.now()}-${safeName}`
        const { error } = await supabase.storage
          .from(imageBucket)
          .upload(uniqueName, file, { upsert: false })
        if (error) throw new Error(error.message)

        const { data: pub } = supabase.storage
          .from(imageBucket)
          .getPublicUrl(uniqueName)

        const alt = file.name.replace(/\.[^.]+$/, '')
        const md = `![${alt}](${pub.publicUrl})\n`
        // Append at end for simplicity (drag&drop can't reliably know cursor).
        onChange(value + (value.endsWith('\n') || value === '' ? '' : '\n') + md)
        toast({
          title: 'Image inserted',
          description: 'Uploaded and embedded in the content.',
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed'
        toast({ title: 'Image upload failed', description: msg, variant: 'destructive' })
      } finally {
        setUploading(false)
      }
    },
    [imageBucket, onChange, toast, value],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const files = Array.from(e.dataTransfer.files || []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      files.forEach((f) => uploadAndInsert(f))
    },
    [uploadAndInsert],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imageItems = items.filter((i) => i.type.startsWith('image/'))
      if (imageItems.length === 0) return
      e.preventDefault()
      imageItems.forEach((item) => {
        const file = item.getAsFile()
        if (file) uploadAndInsert(file)
      })
    },
    [uploadAndInsert],
  )

  // Build the command list: keep defaults, add our custom ones.
  const customCommands: ICommand[] = [
    cmdImageUpload,
    cmdTable,
    cmdCodeBlock,
    cmdCallout,
    cmdYoutube,
  ]

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onDrop={onDrop}
      onPaste={onPaste}
      data-color-mode="light"
    >
      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded">
          <div className="flex items-center gap-2 text-gray-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Uploading image…</span>
          </div>
        </div>
      )}
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        height={height}
        visibleDragbar={false}
        preview="live"
        commands={[...commands.getCommands(), ...customCommands]}
        previewOptions={{
          rehypePlugins: [
            [rehypeRaw, { passThrough: ['mdxJsxTextElement', 'mdxJsxFlowElement'] }],
          ],
        }}
      />
    </div>
  )
}

export default RichTextEditor
