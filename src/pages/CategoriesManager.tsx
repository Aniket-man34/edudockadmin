import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Megaphone,
  Wrench,
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
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase, TABLES } from '@/lib/supabase'
import type { Category } from '@/types/category'

const CategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEntityType, setFormEntityType] = useState<'pdf' | 'update' | 'tool'>('pdf')

  const { toast } = useToast()

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch categories. Please check your Supabase configuration.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormEntityType('pdf')
  }

  const openAddDialog = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormName(category.name)
    setFormEntityType(category.entity_type)
    setIsEditDialogOpen(true)
  }

  // Handle Add Category
  const handleAddCategory = async () => {
    if (!formName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error: insertError } = await supabase
        .from(TABLES.CATEGORIES)
        .insert({
          name: formName.trim(),
          entity_type: formEntityType,
        })

      if (insertError) throw insertError

      toast({
        title: 'Success',
        description: 'Category created successfully!',
        variant: 'default',
      })

      setIsAddDialogOpen(false)
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error('Error creating category:', error)
      toast({
        title: 'Error',
        description: 'Failed to create category. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Category
  const handleEditCategory = async () => {
    if (!selectedCategory || !formName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase
        .from(TABLES.CATEGORIES)
        .update({
          name: formName.trim(),
          entity_type: formEntityType,
        })
        .eq('id', selectedCategory.id)

      if (updateError) throw updateError

      toast({
        title: 'Success',
        description: 'Category updated successfully!',
        variant: 'default',
      })

      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: 'Error',
        description: 'Failed to update category. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Category
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from(TABLES.CATEGORIES)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Deleted',
        description: 'Category deleted successfully.',
        variant: 'default',
      })

      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete category. Please try again.',
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

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4" />
      case 'update':
        return <Megaphone className="h-4 w-4" />
      case 'tool':
        return <Wrench className="h-4 w-4" />
      default:
        return null
    }
  }

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-blue-100 text-blue-700'
      case 'update':
        return 'bg-green-100 text-green-700'
      case 'tool':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Categories</h1>
          <p className="text-gray-600">Create and manage categories for PDFs, Updates, and Tools</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No categories found. Create your first category to get started.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getEntityTypeColor(category.entity_type)}`}>
                      {getEntityTypeIcon(category.entity_type)}
                      <span className="capitalize">{category.entity_type}</span>
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(category.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(category.id)}
                        title="Delete"
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

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing your content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Category Name</Label>
              <Input
                id="add-name"
                placeholder="e.g., Mathematics, Science, Announcements"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-entity-type">Entity Type</Label>
              <select
                id="add-entity-type"
                value={formEntityType}
                onChange={(e) => setFormEntityType(e.target.value as 'pdf' | 'update' | 'tool')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">PDF</option>
                <option value="update">Update</option>
                <option value="tool">Tool</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Mathematics, Science, Announcements"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-type">Entity Type</Label>
              <select
                id="edit-entity-type"
                value={formEntityType}
                onChange={(e) => setFormEntityType(e.target.value as 'pdf' | 'update' | 'tool')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">PDF</option>
                <option value="update">Update</option>
                <option value="tool">Tool</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CategoriesManager
