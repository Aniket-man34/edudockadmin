import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A lightweight checkbox that mirrors the Radix `@radix-ui/react-checkbox`
 * API (`checked`, `onCheckedChange`, `indeterminate`) without requiring the
 * dependency. Used by DataTable and any bulk-select UI.
 */
export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'checked' | 'onChange'
  > {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const isIndeterminate = checked === 'indeterminate'
    const isChecked = checked === true

    return (
      <span className="relative inline-flex items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          className="peer absolute h-4 w-4 opacity-0"
          checked={isChecked}
          onChange={(e) => {
            if (isIndeterminate) {
              // Clicking an indeterminate box checks it.
              onCheckedChange?.(true)
            } else {
              onCheckedChange?.(e.target.checked)
            }
          }}
          disabled={disabled}
          aria-checked={isIndeterminate ? 'mixed' : isChecked}
          {...props}
        />
        <span
          className={cn(
            'h-4 w-4 rounded border border-gray-300 flex items-center justify-center transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            isChecked || isIndeterminate
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-white',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          {isIndeterminate ? (
            <Minus className="h-3 w-3" />
          ) : isChecked ? (
            <Check className="h-3 w-3" />
          ) : null}
        </span>
      </span>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
