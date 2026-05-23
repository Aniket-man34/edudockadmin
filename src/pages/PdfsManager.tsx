import React, { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Download,
  Loader2,
  FileText,
  Upload,
  Link,
  Folder,
  Crop,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ImageUploader from '@/components/shared/ImageUploader'
import { ImageCropper } from '@/components/shared/ImageCropper'
import GoogleSearchPreview from '@/components/shared/GoogleSearchPreview'
import { useToast } from '@/hooks/use-toast'
import { supabase, STORAGE_BUCKETS, TABLES } from '@/lib/supabase'
import { deleteStorageFile } from '@/lib/storageUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useGlobalSearch } from '@/contexts/GlobalSearchContext'
import type { Pdf } from '@/types/pdf'
import type { Category } from '@/types/category'

const PdfsManager: React.FC = () => {
  const [pdfs, setPdfs] = useState<Pdf[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPdf, setSelectedPdf] = useState<Pdf | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCoverImage, setFormCoverImage] = useState<File | null>(null)
  // Image cropping state
  const [croppingImage, setCroppingImage] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [, setSelectedImageFile] = useState<File | null>(null)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  const [imageUploaderKey, setImageUploaderKey] = useState(0)
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null)
  const [formPdfFileName, setFormPdfFileName] = useState<string>('')
  // Phase 3: PDF source toggle
  const [formPdfSource, setFormPdfSource] = useState<'upload' | 'drive'>('upload')
  const [formDriveLink, setFormDriveLink] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<string>('')

  // SEO Meta Data fields
  const [formSlug, setFormSlug] = useState('')
  const [formMetaTitle, setFormMetaTitle] = useState('')
  const [formMetaDescription, setFormMetaDescription] = useState('')
  const [formSchemaMarkup, setFormSchemaMarkup] = useState('')

  // Track if admin has manually edited the slug manually (disables auto-generation)
  const slugManuallyEdited = useRef(false)

  // Inline Category Creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Generate a URL-friendly slug from a title string
  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')     // remove special characters
      .replace(/\s+/g, '-')          // replace spaces with hyphens
      .replace(/-+/g, '-')           // collapse multiple hyphens
      .replace(/^-|-$/g, '')         // trim leading/trailing hyphens
  }, [])

  const pdfFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { fullName, avatarUrl } = useAuth()
  const { editTarget, closeEdit } = useGlobalSearch()

  // Fetch pdfs from Supabase
  const fetchPdfs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.PDFS)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched pdfs data:', data?.[0]) // Debug: check column names
      setPdfs(data || [])
    } catch (error) {
      console.error('Error fetching pdfs:', error)
      toast({
        title: 'Error',
        description: `Failed to fetch PDFs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories for PDFs
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('entity_type', 'pdf')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchPdfs()
    fetchCategories()
  }, [])

  // Phase 2: Handle global search edit target
  useEffect(() => {
    if (editTarget && editTarget.type === 'pdf') {
      const pdf = pdfs.find((p) => p.id === editTarget.id)
      if (pdf) {
        openEditDialog(pdf)
        closeEdit()
      }
    }
  }, [editTarget, pdfs])

  // Handle inline category creation for PdfsManager
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required.',
        variant: 'destructive',
      })
      return
    }

    setIsAddingCategory(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .insert({
          name: newCategoryName.trim(),
          entity_type: 'pdf',
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Category Added',
        description: `"${newCategoryName.trim()}" category created successfully.`,
        variant: 'default',
      })

      setNewCategoryName('')
      await fetchCategories()
      // Auto-select the newly created category
      if (data) {
        setFormCategoryId(data.id)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      toast({
        title: 'Error',
        description: 'Failed to create category. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsAddingCategory(false)
    }
  }

  // Filter pdfs based on search and category
  const filteredPdfs = pdfs.filter(
    (pdf) =>
      ((pdf.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (pdf.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())) &&
      (!selectedCategoryFilter || pdf.category_id === selectedCategoryFilter)
  )

  // Reset form
  const resetForm = () => {
    slugManuallyEdited.current = false
    setFormTitle('')
    setFormDescription('')
    setFormCoverImage(null)
    setFormPdfFile(null)
    setFormPdfFileName('')
    setFormPdfSource('upload')
    setFormDriveLink('')
    setFormCategoryId('')
    setFormSlug('')
    setFormMetaTitle('')
    setFormMetaDescription('')
    setFormSchemaMarkup('')
    // Reset cropping state
    setCroppingImage(false)
    setTempImage(null)
    setSelectedImageFile(null)
    setCroppedImageUrl(null)
    setImageUploaderKey(prev => prev + 1) // increment to force remount
  }

  // Open Add Dialog
  const openAddDialog = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  // Open Edit Dialog
  const openEditDialog = (pdf: Pdf) => {
    slugManuallyEdited.current = false
    setSelectedPdf(pdf)
    setFormTitle(pdf.title)
    setFormDescription(pdf.description)
    setFormCoverImage(null)
    setFormPdfFile(null)
    setFormPdfFileName(pdf.file_url ? 'Current PDF on file' : '')
    // Phase 3: Set source type from existing data
    setFormPdfSource(pdf.file_type || 'upload')
    setFormDriveLink(pdf.drive_link || '')
    setFormCategoryId(pdf.category_id || '')
    setFormSlug(pdf.slug || '')
    setFormMetaTitle(pdf.meta_title || '')
    setFormMetaDescription(pdf.meta_description || '')
    setFormSchemaMarkup(pdf.schema_markup || '')
    setIsEditDialogOpen(true)
  }

  // Handle PDF file selection
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid File',
          description: 'Please select a PDF file.',
          variant: 'destructive',
        })
        return
      }
      setFormPdfFile(file)
      setFormPdfFileName(file.name)
    }
  }

  // Handle opening image cropper
  const handleOpenCropper = () => {
    if (!formCoverImage) {
      toast({
        title: 'No Image',
        description: 'Please select an image first.',
        variant: 'destructive',
      })
      return
    }
    // Create a preview URL for the selected image
    const url = URL.createObjectURL(formCoverImage)
    setTempImage(url)
    setCroppingImage(true)
  }

  // Handle crop completion
  const handleCropComplete = (file: File) => {
    setSelectedImageFile(file)
    setFormCoverImage(file)
    // Generate a preview URL for the cropped image
    const croppedUrl = URL.createObjectURL(file)
    setCroppedImageUrl(croppedUrl)
    // Clean up temp image URL
    if (tempImage) {
      URL.revokeObjectURL(tempImage)
    }
    setTempImage(null)
    setCroppingImage(false)
    // Increment key to force ImageUploader remount
    setImageUploaderKey(prev => prev + 1)
    toast({
      title: 'Image Cropped',
      description: 'Image has been cropped successfully.',
      variant: 'default',
    })
  }

  // Handle cover image change from ImageUploader
  const handleCoverImageChange = (file: File | null) => {
    setFormCoverImage(file)
    // If a new image is selected (not null), reset cropped image URL
    if (file) {
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl)
        setCroppedImageUrl(null)
      }
      // Also reset selectedImageFile (cropped file) because we have a new original
      setSelectedImageFile(null)
    }
  }

  // Handle Add PDF
  const handleAddPdf = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required.',
        variant: 'destructive',
      })
      return
    }

    // Phase 3: Validate based on source type
    if (formPdfSource === 'upload' && !formPdfFile) {
      toast({
        title: 'Validation Error',
        description: 'Please select a PDF file to upload.',
        variant: 'destructive',
      })
      return
    }
    if (formPdfSource === 'drive' && !formDriveLink.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a Google Drive link.',
        variant: 'destructive',
      })
      return
    }

    // Validate JSON-LD schema markup if provided
    if (formSchemaMarkup.trim()) {
      try {
        JSON.parse(formSchemaMarkup.trim())
      } catch {
        toast({
          title: 'Invalid JSON',
          description: 'Invalid JSON format in Schema Markup.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      let fileUrl = ''

      // Phase 3: Handle based on source type
      if (formPdfSource === 'upload' && formPdfFile) {
        const pdfFileExt = formPdfFile.name.split('.').pop()
        const pdfFileName = `${uuidv4()}.${pdfFileExt}`

        const { error: pdfUploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PDF_FILES)
          .upload(pdfFileName, formPdfFile)

        if (pdfUploadError) throw pdfUploadError

        const { data: pdfUrlData } = supabase.storage
          .from(STORAGE_BUCKETS.PDF_FILES)
          .getPublicUrl(pdfFileName)

        fileUrl = pdfUrlData.publicUrl
      } else if (formPdfSource === 'drive') {
        fileUrl = formDriveLink.trim()
      }

      // Upload cover image if present (already compressed by ImageUploader)
      let coverImageUrl: string | null = null
      if (formCoverImage) {
        const coverExt = formCoverImage.name.split('.').pop()
        const coverFileName = `${uuidv4()}.${coverExt}`

        const { error: coverUploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PDF_COVERS)
          .upload(coverFileName, formCoverImage)

        if (coverUploadError) throw coverUploadError

        const { data: coverUrlData } = supabase.storage
          .from(STORAGE_BUCKETS.PDF_COVERS)
          .getPublicUrl(coverFileName)

        coverImageUrl = coverUrlData.publicUrl
      }

      // Insert record (Phase 5: include author info, SEO meta)
      const { error: insertError } = await supabase
        .from(TABLES.PDFS)
        .insert({
          title: formTitle,
          description: formDescription,
          file_url: fileUrl,
          cover_image_url: coverImageUrl,
          file_type: formPdfSource,
          drive_link: formPdfSource === 'drive' ? formDriveLink.trim() : null,
          author_name: fullName,
          author_avatar: avatarUrl,
          category_id: formCategoryId || null,
          slug: formSlug.trim() || null,
          meta_title: formMetaTitle.trim() || null,
          meta_description: formMetaDescription.trim() || null,
          schema_markup: formSchemaMarkup.trim() || null,
        })

      if (insertError) throw insertError

      toast({
        title: 'Success',
        description: 'PDF uploaded successfully!',
        variant: 'default',
      })

      setIsAddDialogOpen(false)
      resetForm()
      fetchPdfs()
    } catch (error) {
      console.error('Error creating PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit PDF
  const handleEditPdf = async () => {
    if (!selectedPdf || !formTitle.trim() || !formDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required.',
        variant: 'destructive',
      })
      return
    }

    // Phase 3: Validate based on source type
    if (formPdfSource === 'drive' && !formDriveLink.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a Google Drive link.',
        variant: 'destructive',
      })
      return
    }

    // Validate JSON-LD schema markup if provided
    if (formSchemaMarkup.trim()) {
      try {
        JSON.parse(formSchemaMarkup.trim())
      } catch {
        toast({
          title: 'Invalid JSON',
          description: 'Invalid JSON format in Schema Markup.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      let fileUrl = selectedPdf.file_url
      let coverImageUrl = selectedPdf.cover_image_url

      // Phase 3: Handle based on source type
      if (formPdfSource === 'upload' && formPdfFile) {
        // Delete old PDF file from storage (only if it was an uploaded file, not a drive link)
        if (selectedPdf.file_type !== 'drive' && selectedPdf.file_url) {
          await deleteStorageFile(selectedPdf.file_url)
        }

        const pdfFileExt = formPdfFile.name.split('.').pop()
        const pdfFileName = `${uuidv4()}.${pdfFileExt}`

        const { error: pdfUploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PDF_FILES)
          .upload(pdfFileName, formPdfFile)

        if (pdfUploadError) throw pdfUploadError

        const { data: pdfUrlData } = supabase.storage
          .from(STORAGE_BUCKETS.PDF_FILES)
          .getPublicUrl(pdfFileName)

        fileUrl = pdfUrlData.publicUrl
      } else if (formPdfSource === 'drive') {
        // Switching from upload to drive — delete old uploaded file
        if (selectedPdf.file_type !== 'drive' && selectedPdf.file_url) {
          await deleteStorageFile(selectedPdf.file_url)
        }
        fileUrl = formDriveLink.trim()
      }

      // Upload new cover image if changed
      if (formCoverImage) {
        // Delete old cover image from storage
        if (selectedPdf.cover_image_url) {
          await deleteStorageFile(selectedPdf.cover_image_url)
        }

        const coverExt = formCoverImage.name.split('.').pop()
        const coverFileName = `${uuidv4()}.${coverExt}`

        const { error: coverUploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PDF_COVERS)
          .upload(coverFileName, formCoverImage)

        if (coverUploadError) throw coverUploadError

        const { data: coverUrlData } = supabase.storage
          .from(STORAGE_BUCKETS.PDF_COVERS)
          .getPublicUrl(coverFileName)

        coverImageUrl = coverUrlData.publicUrl
      }

      // Update record (Phase 5: include author info, SEO meta)
      const { error: updateError } = await supabase
        .from(TABLES.PDFS)
        .update({
          title: formTitle,
          description: formDescription,
          file_url: fileUrl,
          cover_image_url: coverImageUrl,
          file_type: formPdfSource,
          drive_link: formPdfSource === 'drive' ? formDriveLink.trim() : null,
          author_name: fullName,
          author_avatar: avatarUrl,
          category_id: formCategoryId || null,
          slug: formSlug.trim() || null,
          meta_title: formMetaTitle.trim() || null,
          meta_description: formMetaDescription.trim() || null,
          schema_markup: formSchemaMarkup.trim() || null,
        })
        .eq('id', selectedPdf.id)

      if (updateError) throw updateError

      toast({
        title: 'Success',
        description: 'PDF updated successfully!',
        variant: 'default',
      })

      setIsEditDialogOpen(false)
      setSelectedPdf(null)
      resetForm()
      fetchPdfs()
    } catch (error) {
      console.error('Error updating PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to update PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Phase 4: Handle Delete PDF — delete storage files FIRST, then DB row
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) return

    try {
      // Step 1: Fetch the record to get file URLs
      const { data: pdf, error: fetchError } = await supabase
        .from(TABLES.PDFS)
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Step 2: Delete storage files first
      if (pdf) {
        await deleteStorageFile(pdf.cover_image_url)
        // Only delete file from storage if it was uploaded (not a drive link)
        if (pdf.file_type !== 'drive') {
          await deleteStorageFile(pdf.file_url)
        }
      }

      // Step 3: Delete the DB row
      const { error } = await supabase
        .from(TABLES.PDFS)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Deleted',
        description: 'PDF deleted successfully.',
        variant: 'default',
      })

      fetchPdfs()
    } catch (error) {
      console.error('Error deleting PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete PDF. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  // Phase 3: PDF Source Toggle Component
  const PdfSourceToggle = ({ value, onChange }: { value: 'upload' | 'drive'; onChange: (v: 'upload' | 'drive') => void }) => (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
      <button
        type="button"
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          value === 'upload'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => onChange('upload')}
      >
        <Upload className="h-4 w-4" />
        Upload PDF File
      </button>
      <button
        type="button"
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          value === 'drive'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => onChange('drive')}
      >
        <Link className="h-4 w-4" />
        Paste Google Drive Link
      </button>
    </div>
  )

  // Inline Category Creator component
  const InlineCategoryCreator = () => (
    <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
      <Label className="text-xs font-semibold text-gray-600">Quick Add Category</Label>
      <div className="flex gap-2">
        <Input
          placeholder="New category name..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddCategory()
            }
          }}
          disabled={isAddingCategory}
          className="min-h-[40px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCategory}
          disabled={isAddingCategory}
          className="whitespace-nowrap min-h-[40px]"
        >
          {isAddingCategory ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add Category
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-8 gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Manage PDFs</h1>
          <p className="text-sm md:text-base text-gray-600">Upload and manage PDF resources</p>
        </div>
        <Button onClick={openAddDialog} className="min-h-[44px] w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Upload New PDF
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search PDFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="outline" className="hidden md:inline-flex min-h-[44px]">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Loading PDFs...</p>
                </TableCell>
              </TableRow>
            ) : filteredPdfs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No PDFs found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPdfs.map((pdf) => (
                <TableRow key={pdf.id}>
                  <TableCell>
                    {pdf.cover_image_url ? (
                      <img
                        src={pdf.cover_image_url}
                        alt={pdf.title}
                        className="w-16 h-20 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-16 h-20 flex items-center justify-center rounded border bg-gray-100">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {pdf.title}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell max-w-[300px] truncate">
                    {pdf.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      {pdf.file_url && (
                        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
                          <a href={pdf.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(pdf)}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pdf.id)}
                        className="min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="mt-6 md:mt-8 grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
          <p className="text-xs md:text-sm text-blue-600">Total PDFs</p>
          <p className="text-lg md:text-2xl font-bold">{pdfs.length}</p>
        </div>
        <div className="bg-green-50 p-3 md:p-4 rounded-lg">
          <p className="text-xs md:text-sm text-green-600">With Covers</p>
          <p className="text-lg md:text-2xl font-bold">
            {pdfs.filter((p) => p.cover_image_url).length}
          </p>
        </div>
        <div className="bg-purple-50 p-3 md:p-4 rounded-lg">
          <p className="text-xs md:text-sm text-purple-600">This Month</p>
          <p className="text-lg md:text-2xl font-bold">
            {pdfs.filter((p) => {
              const d = new Date(p.created_at)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length}
          </p>
        </div>
      </div>

      {/* Add PDF Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New PDF</DialogTitle>
            <DialogDescription>
              Upload a PDF file or paste a Google Drive link with an optional cover image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-title">Title</Label>
              <Input
                id="add-title"
                placeholder="Enter PDF title"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value)
                  if (!slugManuallyEdited.current) {
                    setFormSlug(generateSlug(e.target.value))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                placeholder="Enter PDF description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            {/* Phase 3: PDF Source Toggle */}
            <div className="space-y-2">
              <Label>PDF Source</Label>
              <PdfSourceToggle value={formPdfSource} onChange={setFormPdfSource} />
            </div>
            {/* Phase 3: Conditional input based on source */}
            {formPdfSource === 'upload' ? (
              <div className="space-y-2">
                <Label>PDF File *</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => pdfFileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {formPdfFileName || 'Click to select a PDF file'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF files only</p>
                  <input
                    ref={pdfFileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="add-drive-link">Google Drive Link *</Label>
                <Input
                  id="add-drive-link"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formDriveLink}
                  onChange={(e) => setFormDriveLink(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-gray-500">Paste the shareable link to the Google Drive PDF</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-category" className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-purple-500" />
                Category
              </Label>
              <select
                id="add-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inline Category Creator */}
            <InlineCategoryCreator />

            <div className="space-y-3">
              <ImageUploader
                key={imageUploaderKey}
                onImageChange={handleCoverImageChange}
                currentImageUrl={croppedImageUrl || undefined}
                label="Cover Image (Optional)"
                bucketName={STORAGE_BUCKETS.PDF_COVERS}
              />
              {formCoverImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCropper}
                  className="w-full"
                >
                  <Crop className="mr-2 h-4 w-4" />
                  Crop Image
                </Button>
              )}
            </div>

            {/* SEO Meta Data Section */}
            <details className="mt-6 border p-4 rounded-lg bg-gray-50 group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 select-none flex items-center gap-2 list-none">
                <span className="inline-block transition-transform duration-200 group-open:rotate-90">▶</span>
                <span>SEO Meta Data</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Manual Override
                </span>
              </summary>

              <div className="mt-4 space-y-4">
                {/* Live Google Search Preview */}
                <GoogleSearchPreview
                  title={formMetaTitle || formTitle}
                  slug={formSlug}
                  description={formMetaDescription || formDescription}
                />

                {/* Slug */}
                <div className="space-y-1">
                  <Label htmlFor="add-slug">URL Slug</Label>
                  <Input
                    id="add-slug"
                    placeholder="my-pdf-slug"
                    value={formSlug}
                    onChange={(e) => {
                      slugManuallyEdited.current = true
                      setFormSlug(e.target.value)
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    URL-friendly identifier. Leave empty to auto-generate.
                  </p>
                </div>

                {/* Meta Title */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="add-meta-title">Meta Title</Label>
                    <span
                      className={`text-xs font-mono ${
                        formMetaTitle.length > 60 ? 'text-red-500 font-semibold' : 'text-gray-400'
                      }`}
                    >
                      {formMetaTitle.length}/60 chars
                    </span>
                  </div>
                  <Input
                    id="add-meta-title"
                    placeholder="SEO title for search engines"
                    value={formMetaTitle}
                    onChange={(e) => setFormMetaTitle(e.target.value)}
                    className={formMetaTitle.length > 60 ? 'border-red-300 focus:ring-red-500' : ''}
                  />
                  {formMetaTitle.length > 60 && (
                    <p className="text-xs text-red-500">
                      Exceeds Google's recommended 60-character limit. Title will be truncated in search results.
                    </p>
                  )}
                </div>

                {/* Meta Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="add-meta-description">Meta Description</Label>
                    <span
                      className={`text-xs font-mono ${
                        formMetaDescription.length > 160 ? 'text-red-500 font-semibold' : 'text-gray-400'
                      }`}
                    >
                      {formMetaDescription.length}/160 chars
                    </span>
                  </div>
                  <Textarea
                    id="add-meta-description"
                    placeholder="SEO description for search engines"
                    value={formMetaDescription}
                    onChange={(e) => setFormMetaDescription(e.target.value)}
                    rows={3}
                    className={formMetaDescription.length > 160 ? 'border-red-300 focus:ring-red-500' : ''}
                  />
                  {formMetaDescription.length > 160 && (
                    <p className="text-xs text-red-500">
                      Exceeds Google's recommended 160-character limit. Description will be truncated in search results.
                    </p>
                  )}
                </div>

                {/* Schema Markup (JSON-LD) */}
                <div className="space-y-1">
                  <Label htmlFor="add-schema-markup">Schema Markup (JSON-LD)</Label>
                  <Textarea
                    id="add-schema-markup"
                    placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "Your question here?",\n    "acceptedAnswer": {\n      "@type": "Answer",\n      "text": "Your answer here."\n    }\n  }]\n}`}
                    value={formSchemaMarkup}
                    onChange={(e) => setFormSchemaMarkup(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Paste valid JSON-LD schema markup for Google Rich Snippets (FAQ, Article, BreadcrumbList, etc.).
                  </p>
                </div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPdf} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload PDF'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit PDF Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit PDF</DialogTitle>
            <DialogDescription>
              Modify the PDF details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter PDF title"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value)
                  if (!slugManuallyEdited.current) {
                    setFormSlug(generateSlug(e.target.value))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter PDF description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            {/* Phase 3: PDF Source Toggle */}
            <div className="space-y-2">
              <Label>PDF Source</Label>
              <PdfSourceToggle value={formPdfSource} onChange={setFormPdfSource} />
            </div>
            {/* Phase 3: Conditional input based on source */}
            {formPdfSource === 'upload' ? (
              <div className="space-y-2">
                <Label>PDF File</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => pdfFileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {formPdfFileName || 'Click to select a new PDF file'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to keep the current file
                  </p>
                  <input
                    ref={pdfFileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-drive-link">Google Drive Link *</Label>
                <Input
                  id="edit-drive-link"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formDriveLink}
                  onChange={(e) => setFormDriveLink(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-gray-500">Paste the shareable link to the Google Drive PDF</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-purple-500" />
                Category
              </Label>
              <select
                id="edit-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inline Category Creator */}
            <InlineCategoryCreator />

            <div className="space-y-3">
              <ImageUploader
                key={imageUploaderKey}
                onImageChange={handleCoverImageChange}
                currentImageUrl={croppedImageUrl || selectedPdf?.cover_image_url}
                label="Cover Image"
                bucketName={STORAGE_BUCKETS.PDF_COVERS}
              />
              {formCoverImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCropper}
                  className="w-full"
                >
                  <Crop className="mr-2 h-4 w-4" />
                  Crop Image
                </Button>
              )}
            </div>

            {/* SEO Meta Data Section */}
            <details className="mt-6 border p-4 rounded-lg bg-gray-50 group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 select-none flex items-center gap-2 list-none">
                <span className="inline-block transition-transform duration-200 group-open:rotate-90">▶</span>
                <span>SEO Meta Data</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Manual Override
                </span>
              </summary>

              <div className="mt-4 space-y-4">
                {/* Live Google Search Preview */}
                <GoogleSearchPreview
                  title={formMetaTitle || formTitle}
                  slug={formSlug}
                  description={formMetaDescription || formDescription}
                />

                {/* Slug */}
                <div className="space-y-1">
                  <Label htmlFor="edit-slug">URL Slug</Label>
                  <Input
                    id="edit-slug"
                    placeholder="my-pdf-slug"
                    value={formSlug}
                    onChange={(e) => {
                      slugManuallyEdited.current = true
                      setFormSlug(e.target.value)
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    URL-friendly identifier. Leave empty to auto-generate.
                  </p>
                </div>

                {/* Meta Title */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-meta-title">Meta Title</Label>
                    <span
                      className={`text-xs font-mono ${
                        formMetaTitle.length > 60 ? 'text-red-500 font-semibold' : 'text-gray-400'
                      }`}
                    >
                      {formMetaTitle.length}/60 chars
                    </span>
                  </div>
                  <Input
                    id="edit-meta-title"
                    placeholder="SEO title for search engines"
                    value={formMetaTitle}
                    onChange={(e) => setFormMetaTitle(e.target.value)}
                    className={formMetaTitle.length > 60 ? 'border-red-300 focus:ring-red-500' : ''}
                  />
                  {formMetaTitle.length > 60 && (
                    <p className="text-xs text-red-500">
                      Exceeds Google's recommended 60-character limit. Title will be truncated in search results.
                    </p>
                  )}
                </div>

                {/* Meta Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-meta-description">Meta Description</Label>
                    <span
                      className={`text-xs font-mono ${
                        formMetaDescription.length > 160 ? 'text-red-500 font-semibold' : 'text-gray-400'
                      }`}
                    >
                      {formMetaDescription.length}/160 chars
                    </span>
                  </div>
                  <Textarea
                    id="edit-meta-description"
                    placeholder="SEO description for search engines"
                    value={formMetaDescription}
                    onChange={(e) => setFormMetaDescription(e.target.value)}
                    rows={3}
                    className={formMetaDescription.length > 160 ? 'border-red-300 focus:ring-red-500' : ''}
                  />
                  {formMetaDescription.length > 160 && (
                    <p className="text-xs text-red-500">
                      Exceeds Google's recommended 160-character limit. Description will be truncated in search results.
                    </p>
                  )}
                </div>

                {/* Schema Markup (JSON-LD) */}
                <div className="space-y-1">
                  <Label htmlFor="edit-schema-markup">Schema Markup (JSON-LD)</Label>
                  <Textarea
                    id="edit-schema-markup"
                    placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "Your question here?",\n    "acceptedAnswer": {\n      "@type": "Answer",\n      "text": "Your answer here."\n    }\n  }]\n}`}
                    value={formSchemaMarkup}
                    onChange={(e) => setFormSchemaMarkup(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Paste valid JSON-LD schema markup for Google Rich Snippets (FAQ, Article, BreadcrumbList, etc.).
                  </p>
                </div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditPdf} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal */}
      <ImageCropper
        open={croppingImage}
        onOpenChange={setCroppingImage}
        onCropComplete={handleCropComplete}
        initialImage={tempImage || undefined}
      />
    </div>
  )
}

export default PdfsManager
