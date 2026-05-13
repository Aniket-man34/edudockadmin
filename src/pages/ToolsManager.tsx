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
  Wrench,
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
import { useToast } from '@/hooks/use-toast'
import { supabase, STORAGE_BUCKETS, TABLES } from '@/lib/supabase'
import { deleteStorageFile } from '@/lib/storageUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useGlobalSearch } from '@/contexts/GlobalSearchContext'
import type { Tool } from '@/types/tool'
import type { Category } from '@/types/category'

const ToolsManager: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formImage, setFormImage] = useState<File | null>(null)
  // Phase 3: Image source toggle
  const [formImageSource, setFormImageSource] = useState<'upload' | 'favicon'>('upload')
  const [formFaviconUrl, setFormFaviconUrl] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<string>('')

  // Image cropping state
  const [croppingImage, setCroppingImage] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  const [imageUploaderKey, setImageUploaderKey] = useState(0)

  const { toast } = useToast()
  const { fullName, avatarUrl } = useAuth()
  const { editTarget, closeEdit } = useGlobalSearch()

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (tempImage) {
        URL.revokeObjectURL(tempImage)
      }
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl)
      }
    }
  }, [tempImage, croppedImageUrl])

  // Fetch tools from Supabase
  const fetchTools = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.TOOLS)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched tools data:', data?.[0]) // Debug: check column names
      setTools(data || [])
    } catch (error) {
      console.error('Error fetching tools:', error)
      toast({
        title: 'Error',
        description: `Failed to fetch tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories for Tools
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('entity_type', 'tool')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchTools()
    fetchCategories()
  }, [])

  // Phase 2: Handle global search edit target
  useEffect(() => {
    if (editTarget && editTarget.type === 'tool') {
      const tool = tools.find((t) => t.id === editTarget.id)
      if (tool) {
        openEditDialog(tool)
        closeEdit()
      }
    }
  }, [editTarget, tools])

  // Filter tools based on search and category
  const filteredTools = tools.filter(
    (tool) =>
      ((tool.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (tool.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())) &&
      (!selectedCategoryFilter || tool.category_id === selectedCategoryFilter)
  )

  // Reset form
  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormUrl('')
    setFormImage(null)
    setFormImageSource('upload')
    setFormFaviconUrl('')
    setFormCategoryId('')
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
  const openEditDialog = (tool: Tool) => {
    setSelectedTool(tool)
    setFormTitle(tool.title)
    setFormDescription(tool.description)
    setFormUrl(tool.url)
    setFormImage(null)
    // Phase 3: Set image source type from existing data
    setFormImageSource(tool.image_type || 'upload')
    setFormFaviconUrl(tool.favicon_url || '')
    setFormCategoryId(tool.category_id || '')
    setIsEditDialogOpen(true)
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

  // Handle Add Tool
  const handleAddTool = async () => {
    if (!formTitle.trim() || !formDescription.trim() || !formUrl.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title, description, and URL are required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl: string | null = null

      // Phase 3: Handle based on image source type
      if (formImageSource === 'upload') {
        // Use cropped image if available, otherwise original
        const imageToUpload = selectedImageFile || formImage
        if (imageToUpload) {
          // Upload image (already compressed by ImageUploader)
          const fileExt = imageToUpload.name.split('.').pop()
          const fileName = `${uuidv4()}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.TOOL_IMAGES)
            .upload(fileName, imageToUpload)

          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKETS.TOOL_IMAGES)
            .getPublicUrl(fileName)

          imageUrl = urlData.publicUrl
        }
      } else if (formImageSource === 'favicon' && formFaviconUrl.trim()) {
        // Use favicon URL directly as the image
        imageUrl = formFaviconUrl.trim()
      }

      // Insert record (Phase 3: image_type/favicon_url, Phase 5: author info, category_id)
      const { error: insertError } = await supabase
        .from(TABLES.TOOLS)
        .insert({
          title: formTitle,
          description: formDescription,
          url: formUrl,
          image_url: imageUrl,
          image_type: formImageSource,
          favicon_url: formImageSource === 'favicon' ? formFaviconUrl.trim() : null,
          author_name: fullName,
          author_avatar: avatarUrl,
          category_id: formCategoryId || null,
        })

      if (insertError) throw insertError

      toast({
        title: 'Success',
        description: 'Tool created successfully!',
        variant: 'default',
      })

      setIsAddDialogOpen(false)
      resetForm()
      fetchTools()
    } catch (error) {
      console.error('Error creating tool:', error)
      toast({
        title: 'Error',
        description: 'Failed to create tool. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Tool
  const handleEditTool = async () => {
    if (!selectedTool || !formTitle.trim() || !formDescription.trim() || !formUrl.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title, description, and URL are required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl = selectedTool.image_url

      // Phase 3: Handle based on image source type
      if (formImageSource === 'upload') {
        // Use cropped image if available, otherwise original
        const imageToUpload = selectedImageFile || formImage
        if (imageToUpload) {
          // Delete old uploaded image from storage (only if it was an upload, not a favicon URL)
          if (selectedTool.image_type !== 'favicon' && selectedTool.image_url) {
            await deleteStorageFile(selectedTool.image_url)
          }

          const fileExt = imageToUpload.name.split('.').pop()
          const fileName = `${uuidv4()}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.TOOL_IMAGES)
            .upload(fileName, imageToUpload)

          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKETS.TOOL_IMAGES)
            .getPublicUrl(fileName)

          imageUrl = urlData.publicUrl
        }
      } else if (formImageSource === 'favicon') {
        // Switching from upload to favicon — delete old uploaded image
        if (selectedTool.image_type !== 'favicon' && selectedTool.image_url) {
          await deleteStorageFile(selectedTool.image_url)
        }
        imageUrl = formFaviconUrl.trim() || null
      }

      // Update record (Phase 3: image_type/favicon_url, Phase 5: author info, category_id)
      const { error: updateError } = await supabase
        .from(TABLES.TOOLS)
        .update({
          title: formTitle,
          description: formDescription,
          url: formUrl,
          image_url: imageUrl,
          image_type: formImageSource,
          favicon_url: formImageSource === 'favicon' ? formFaviconUrl.trim() : null,
          author_name: fullName,
          author_avatar: avatarUrl,
          category_id: formCategoryId || null,
        })
        .eq('id', selectedTool.id)

      if (updateError) throw updateError

      toast({
        title: 'Success',
        description: 'Tool updated successfully!',
        variant: 'default',
      })

      setIsEditDialogOpen(false)
      setSelectedTool(null)
      resetForm()
      fetchTools()
    } catch (error) {
      console.error('Error updating tool:', error)
      toast({
        title: 'Error',
        description: 'Failed to update tool. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Phase 4: Handle Delete Tool — delete storage files FIRST, then DB row
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tool?')) return

    try {
      // Step 1: Fetch the record to get file URLs
      const { data: tool, error: fetchError } = await supabase
        .from(TABLES.TOOLS)
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Step 2: Delete storage files first (only for uploaded images, not favicon URLs)
      if (tool && tool.image_type !== 'favicon') {
        await deleteStorageFile(tool.image_url)
      }

      // Step 3: Delete the DB row
      const { error } = await supabase
        .from(TABLES.TOOLS)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Deleted',
        description: 'Tool deleted successfully.',
        variant: 'default',
      })

      fetchTools()
    } catch (error) {
      console.error('Error deleting tool:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete tool. Please try again.',
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

  // Phase 3: Image Source Toggle Component
  const ImageSourceToggle = ({ value, onChange }: { value: 'upload' | 'favicon'; onChange: (v: 'upload' | 'favicon') => void }) => (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
      <button
        type="button"
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          value === 'upload'
            ? 'bg-purple-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => onChange('upload')}
      >
        <Upload className="h-4 w-4" />
        Upload Tool Image
      </button>
      <button
        type="button"
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          value === 'favicon'
            ? 'bg-purple-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => onChange('favicon')}
      >
        <Link className="h-4 w-4" />
        Enter Favicon URL
      </button>
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-8 gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Manage Tools</h1>
          <p className="text-sm md:text-base text-gray-600">Add and manage educational tools</p>
        </div>
        <Button onClick={openAddDialog} className="min-h-[44px] w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New Tool
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tools..."
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

      {/* Tools Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 md:w-20">Preview</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden sm:table-cell">URL</TableHead>
              <TableHead className="hidden lg:table-cell">Image Source</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">Loading tools...</p>
                </TableCell>
              </TableRow>
            ) : filteredTools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No tools found. Add your first tool!
                </TableCell>
              </TableRow>
            ) : (
              filteredTools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    {tool.image_url ? (
                      <div className="h-12 w-12 rounded overflow-hidden flex items-center justify-center">
                        <img
                          src={tool.image_url}
                          alt={tool.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{tool.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{tool.description}</TableCell>
                  <TableCell>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      tool.image_type === 'favicon'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {tool.image_type === 'favicon' ? (
                        <><Link className="h-3 w-3" /> Favicon</>
                      ) : (
                        <><Upload className="h-3 w-3" /> Upload</>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(tool.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={tool.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(tool)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tool.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Total Tools</p>
          <p className="text-2xl font-bold">{tools.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">With Images</p>
          <p className="text-2xl font-bold">
            {tools.filter((t) => t.image_url).length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600">This Month</p>
          <p className="text-2xl font-bold">
            {tools.filter((t) => {
              const d = new Date(t.created_at)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length}
          </p>
        </div>
      </div>

      {/* Add Tool Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Tool</DialogTitle>
            <DialogDescription>
              Add a new educational tool or resource.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-title">Title</Label>
              <Input
                id="add-title"
                placeholder="Enter tool title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                placeholder="Enter tool description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-url">Tool URL</Label>
              <Input
                id="add-url"
                placeholder="https://example.com/tool"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                type="url"
              />
            </div>
            {/* Phase 3: Image Source Toggle */}
            <div className="space-y-2">
              <Label>Tool Image Source</Label>
              <ImageSourceToggle value={formImageSource} onChange={setFormImageSource} />
            </div>
            {/* Phase 3: Conditional input based on image source */}
            {formImageSource === 'upload' ? (
              <div className="space-y-3">
                <ImageUploader
                  key={imageUploaderKey}
                  onImageChange={handleImageChange}
                  currentImageUrl={croppedImageUrl || undefined}
                  label="Tool Image (Optional)"
                  bucketName={STORAGE_BUCKETS.TOOL_IMAGES}
                />
                {(croppedImageUrl || formImage) && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formImage) {
                          const url = URL.createObjectURL(formImage)
                          setTempImage(url)
                          setCroppingImage(true)
                        }
                      }}
                      disabled={!formImage}
                      className="flex items-center gap-2"
                    >
                      <Crop className="h-4 w-4" />
                      Crop Image
                    </Button>
                    {croppedImageUrl && (
                      <div className="text-xs text-gray-500">
                        Cropped preview is shown above
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="add-favicon-url">Favicon URL</Label>
                <Input
                  id="add-favicon-url"
                  placeholder="https://example.com/favicon.ico"
                  value={formFaviconUrl}
                  onChange={(e) => setFormFaviconUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-gray-500">Enter the URL of the tool's favicon or logo image</p>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTool} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Tool'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tool Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tool</DialogTitle>
            <DialogDescription>
              Modify the tool details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter tool title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter tool description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">Tool URL</Label>
              <Input
                id="edit-url"
                placeholder="https://example.com/tool"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                type="url"
              />
            </div>
            {/* Phase 3: Image Source Toggle */}
            <div className="space-y-2">
              <Label>Tool Image Source</Label>
              <ImageSourceToggle value={formImageSource} onChange={setFormImageSource} />
            </div>
            {/* Phase 3: Conditional input based on image source */}
            {formImageSource === 'upload' ? (
              <div className="space-y-3">
                <ImageUploader
                  key={imageUploaderKey}
                  onImageChange={handleImageChange}
                  currentImageUrl={croppedImageUrl || selectedTool?.image_url}
                  label="Tool Image"
                  bucketName={STORAGE_BUCKETS.TOOL_IMAGES}
                />
                {(croppedImageUrl || formImage) && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formImage) {
                          const url = URL.createObjectURL(formImage)
                          setTempImage(url)
                          setCroppingImage(true)
                        }
                      }}
                      disabled={!formImage}
                      className="flex items-center gap-2"
                    >
                      <Crop className="h-4 w-4" />
                      Crop Image
                    </Button>
                    {croppedImageUrl && (
                      <div className="text-xs text-gray-500">
                        Cropped preview is shown above
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-favicon-url">Favicon URL</Label>
                <Input
                  id="edit-favicon-url"
                  placeholder="https://example.com/favicon.ico"
                  value={formFaviconUrl}
                  onChange={(e) => setFormFaviconUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-gray-500">Enter the URL of the tool's favicon or logo image</p>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTool} disabled={isSubmitting}>
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

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={croppingImage}
        onOpenChange={setCroppingImage}
        onCropComplete={handleCropComplete}
        initialImage={tempImage || undefined}
      />
    </div>
  )
}

export default ToolsManager
