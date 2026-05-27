import React from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InlineCategoryCreatorProps {
  newCategoryName: string
  onNewCategoryNameChange: (value: string) => void
  onAddCategory: () => void
  isAddingCategory: boolean
}

/**
 * Standalone, memoized inline category creator.
 * Defined at module level (not inside a parent render function) so React
 * preserves the same component identity across re-renders, preventing
 * unmount/remount that kills input focus and dismisses mobile keyboards.
 */
const InlineCategoryCreator: React.FC<InlineCategoryCreatorProps> = React.memo(
  ({ newCategoryName, onNewCategoryNameChange, onAddCategory, isAddingCategory }) => (
    <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
      <Label className="text-xs font-semibold text-gray-600">Quick Add Category</Label>
      <div className="flex gap-2">
        <Input
          placeholder="New category name..."
          value={newCategoryName}
          onChange={(e) => onNewCategoryNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAddCategory()
            }
          }}
          disabled={isAddingCategory}
          className="min-h-[40px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddCategory}
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
)

InlineCategoryCreator.displayName = 'InlineCategoryCreator'

export default InlineCategoryCreator