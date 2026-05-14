import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Loader2,
  ExternalLink,
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
import type { Update } from '@/types/update'
import type { Category } from '@/types/category'

const UpdatesManager: React.FC = () => {
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formImage, setFormImage] = useState<File | null>(null)
  // Image cropping state
  const [croppingImage, setCroppingImage] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  const [imageUploaderKey, setImageUploaderKey] = useState(0)
  // Phase 3: External URL field
  const [formExternalUrl, setFormExternalUrl] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<string>('')
  // SEO Meta Data fields
  const [formSlug, setFormSlug] = useState('')
  const [formMetaTitle, setFormMetaTitle] = useState('')
  const [formMetaDescription, setFormMetaDescription] = useState('')
  const [formSchemaMarkup, setFormSchemaMarkup] = useState('')

  const { toast } = useToast()
  const { fullName, avatarUrl } = useAuth()
  const { editTarget, closeEdit } = useGlobalSearch()

  // Fetch updates from Supabase
  const fetchUpdates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.UPDATES)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched updates data:', data?.[0]) // Debug: check column names
      setUpdates(data || [])
    } catch (error) {
      console.error('Error fetching updates:', error)
      toast({
        title: 'Error',
        description: `Failed to fetch updates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories for Updates
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('entity_type', 'update')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchUpdates()
    fetchCategories()
  }, [])

  // Phase 2: Handle global search edit target
  useEffect(() => {
    if (editTarget && editTarget.type === 'update') {
      const update = updates.find((u) => u.id === editTarget.id)
      if (update) {
        openEditDialog(update)
        closeEdit()
      }
    }
  }, [editTarget, updates])

  // Filter updates based on search and category
  const filteredUpdates = updates.filter(
    (update) =>
      ((update.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (update.content?.toLowerCase() || '').includes(searchQuery.toLowerCase())) &&
      (!selectedCategoryFilter || update.category_id === selectedCategoryFilter)
  )

  // Reset form
  const resetForm = () => {
    setFormTitle('')
    setFormContent('')
    setFormImage(null)
    setFormExternalUrl('')
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
  const openEditDialog = (update: Update) => {
    setSelectedUpdate(update)
    setFormTitle(update.title)
    setFormContent(update.content)
    setFormImage(null)
    setFormExternalUrl(update.external_url || '')
    setFormCategoryId(update.category_id || '')
    setFormSlug(update.slug || '')
    setFormMetaTitle(update.meta_title || '')
    setFormMetaDescription(update.meta_description || '')
    setFormSchemaMarkup(update.schema_markup || '')
    setIsEditDialogOpen(true)
  }

  // Handle opening image cropper
  const handleOpenCropper = () => {
    if (!formImage) {
      toast({
        title: 'No Image',
        description: 'Please select an image first.',
        variant: 'destructive',
      })
      return
    }
    // Create a preview URL for the selected image
    const url = URL.createObjectURL(formImage)
    setTempImage(url)
    setCroppingImage(true)
  }

  // Handle crop completion
  const handleCropComplete = (file: File) => {
    setSelectedImageFile(file)
    setFormImage(file)
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

  // Handle image change from ImageUploader
  const handleImageChange = (file: File | null) => {
    setFormImage(file)
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

  // Handle Add Update
  const handleAddUpdate = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required.',
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
      let imageUrl: string | null = null

      // Upload image if present (use cropped image if available, otherwise original)
      const imageToUpload = selectedImageFile || formImage
      if (imageToUpload) {
        const fileExt = imageToUpload.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.UPDATE_IMAGES)
          .upload(fileName, imageToUpload)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.UPDATE_IMAGES)
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      // Insert record (Phase 3: external_url, Phase 5: author info, SEO meta)
      const { error: insertError } = await supabase
        .from(TABLES.UPDATES)
        .insert({
          title: formTitle,
          content: formContent,
          image_url: imageUrl,
          external_url: formExternalUrl.trim() || null,
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
        description: 'Update created successfully!',
        variant: 'default',
      })

      setIsAddDialogOpen(false)
      resetForm()
      fetchUpdates()
    } catch (error) {
      console.error('Error creating update:', error)
      toast({
        title: 'Error',
        description: 'Failed to create update. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Update
  const handleEditUpdate = async () => {
    if (!selectedUpdate || !formTitle.trim() || !formContent.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required.',
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
      let imageUrl = selectedUpdate.image_url

      // Upload new image if changed (use cropped image if available, otherwise original)
      const imageToUpload = selectedImageFile || formImage
      if (imageToUpload) {
        // Delete old image from storage before uploading new one
        if (selectedUpdate.image_url) {
          await deleteStorageFile(selectedUpdate.image_url)
        }

        const fileExt = imageToUpload.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.UPDATE_IMAGES)
          .upload(fileName, imageToUpload)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.UPDATE_IMAGES)
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      // Update record (Phase 3: external_url, Phase 5: author info, category_id, SEO meta)
      const { error: updateError } = await supabase
        .from(TABLES.UPDATES)
        .update({
          title: formTitle,
          content: formContent,
          image_url: imageUrl,
          external_url: formExternalUrl.trim() || null,
          author_name: fullName,
          author_avatar: avatarUrl,
          category_id: formCategoryId || null,
          slug: formSlug.trim() || null,
          meta_title: formMetaTitle.trim() || null,
          meta_description: formMetaDescription.trim() || null,
          schema_markup: formSchemaMarkup.trim() || null,
        })
        .eq('id', selectedUpdate.id)

      if (updateError) throw updateError

      toast({
        title: 'Success',
        description: 'Update modified successfully!',
        variant: 'default',
      })

      setIsEditDialogOpen(false)
      setSelectedUpdate(null)
      resetForm()
      fetchUpdates()
    } catch (error) {
      console.error('Error updating update:', error)
      toast({
        title: 'Error',
        description: 'Failed to update record. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Phase 4: Handle Delete Update — delete storage files FIRST, then DB row
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return

    try {
      // Step 1: Fetch the record to get file URLs
      const { data: update, error: fetchError } = await supabase
        .from(TABLES.UPDATES)
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Step 2: Delete storage files first
      if (update) {
        await deleteStorageFile(update.image_url)
      }

      // Step 3: Delete the DB row
      const { error } = await supabase
        .from(TABLES.UPDATES)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Deleted',
        description: 'Update deleted successfully.',
        variant: 'default',
      })

      fetchUpdates()
    } catch (error) {
      console.error('Error deleting update:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete update. Please try again.',
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-8 gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Manage Updates</h1>
          <p className="text-sm md:text-base text-gray-600">Create and manage platform updates</p>
        </div>
        <Button onClick={openAddDialog} className="min-h-[44px] w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New Update
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 min-h-[44px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" className="hidden md:inline-flex min-h-[44px]">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <Button variant="outline" className="hidden md:inline-flex min-h-[44px]">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Updates Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 md:w-20">Preview</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Content</TableHead>
              <TableHead className="hidden sm:table-cell">External URL</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">Loading updates...</p>
                </TableCell>
              </TableRow>
            ) : filteredUpdates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No updates found. Create your first update!
                </TableCell>
              </TableRow>
            ) : (
              filteredUpdates.map((update) => (
                <TableRow key={update.id}>
                  <TableCell>
                    {update.image_url ? (
                      <div className="h-12 w-16 rounded overflow-hidden">
                        <img
                          src={update.image_url}
                          alt={update.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-16 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">No image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] sm:max-w-none truncate">{update.title}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate">{update.content}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {update.external_url ? (
                      <a
                        href={update.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(update.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(update)}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(update.id)}
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
          <p className="text-xs md:text-sm text-blue-600">Total Updates</p>
          <p className="text-lg md:text-2xl font-bold">{updates.length}</p>
        </div>
        <div className="bg-green-50 p-3 md:p-4 rounded-lg">
          <p className="text-xs md:text-sm text-green-600">With Images</p>
          <p className="text-lg md:text-2xl font-bold">
            {updates.filter((u) => u.image_url).length}
          </p>
        </div>
        <div className="bg-purple-50 p-3 md:p-4 rounded-lg">
          <p className="text-xs md:text-sm text-purple-600">This Month</p>
          <p className="text-lg md:text-2xl font-bold">
            {updates.filter((u) => {
              const d = new Date(u.created_at)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length}
          </p>
        </div>
      </div>

      {/* Add Update Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Update</DialogTitle>
            <DialogDescription>
              Create a new platform update or announcement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Phase 3: External URL field visually prioritized (at the top) */}
            <div className="space-y-2">
              <Label htmlFor="add-external-url" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-500" />
                External URL
              </Label>
              <Input
                id="add-external-url"
                placeholder="https://example.com/article"
                value={formExternalUrl}
                onChange={(e) => setFormExternalUrl(e.target.value)}
                type="url"
              />
              <p className="text-xs text-gray-500">Link to the original source or reference page</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-title">Title</Label>
              <Input
                id="add-title"
                placeholder="Enter update title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-content">Content</Label>
              <Textarea
                id="add-content"
                placeholder="Enter update content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-3">
              <ImageUploader
                key={imageUploaderKey}
                onImageChange={handleImageChange}
                currentImageUrl={croppedImageUrl || undefined}
                label="Update Image"
                bucketName={STORAGE_BUCKETS.UPDATE_IMAGES}
              />
              {formImage && (
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
            <div className="space-y-2">
              <Label htmlFor="add-category" className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-purple-500" />
                Category
              </Label>
              <select
                id="add-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SEO Meta Data Section */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-gray-700">SEO Meta Data</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Manual Override
                </span>
              </div>

              {/* Live Google Search Preview */}
              <GoogleSearchPreview
                title={formMetaTitle || formTitle}
                slug={formSlug}
                description={formMetaDescription || formContent}
              />

              <div className="space-y-4 mt-4">
                {/* Slug */}
                <div className="space-y-1">
                  <Label htmlFor="add-slug">URL Slug</Label>
                  <Input
                    id="add-slug"
                    placeholder="my-update-slug"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUpdate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Update Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Update</DialogTitle>
            <DialogDescription>
              Modify the update details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Phase 3: External URL field visually prioritized (at the top) */}
            <div className="space-y-2">
              <Label htmlFor="edit-external-url" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-500" />
                External URL
              </Label>
              <Input
                id="edit-external-url"
                placeholder="https://example.com/article"
                value={formExternalUrl}
                onChange={(e) => setFormExternalUrl(e.target.value)}
                type="url"
              />
              <p className="text-xs text-gray-500">Link to the original source or reference page</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter update title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                placeholder="Enter update content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-3">
              <ImageUploader
                key={imageUploaderKey}
                onImageChange={handleImageChange}
                currentImageUrl={croppedImageUrl || selectedUpdate?.image_url}
                label="Update Image"
                bucketName={STORAGE_BUCKETS.UPDATE_IMAGES}
              />
              {formImage && (
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
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-purple-500" />
                Category
              </Label>
              <select
                id="edit-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SEO Meta Data Section */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-gray-700">SEO Meta Data</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Manual Override
                </span>
              </div>

              {/* Live Google Search Preview */}
              <GoogleSearchPreview
                title={formMetaTitle || formTitle}
                slug={formSlug}
                description={formMetaDescription || formContent}
              />

              <div className="space-y-4 mt-4">
                {/* Slug */}
                <div className="space-y-1">
                  <Label htmlFor="edit-slug">URL Slug</Label>
                  <Input
                    id="edit-slug"
                    placeholder="my-update-slug"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditUpdate} disabled={isSubmitting}>
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

export default UpdatesManager
