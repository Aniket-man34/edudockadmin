# Sidebar Roll In / Roll Out Implementation Plan

## Overview
Add collapse (roll in) and expand (roll out) functionality to the admin sidebar, allowing users to toggle between full-width and icon-only states.

## Current State Analysis

### Existing Components
1. **Sidebar.tsx** (`src/components/admin/Sidebar.tsx`)
   - Fixed width: `w-64` (256px)
   - Mobile: Off-canvas drawer with backdrop
   - Desktop: Always visible, static positioning
   - Navigation items with icons and text labels

2. **AdminLayout.tsx** (`src/components/admin/AdminLayout.tsx`)
   - Manages sidebar open/close state for mobile
   - Sidebar is always visible on desktop (`md:sticky`)
   - No collapse/expand functionality currently

3. **Header.tsx** (`src/components/admin/Header.tsx`)
   - Has menu button for mobile sidebar toggle
   - Could be extended with collapse toggle for desktop

## Implementation Plan

### 1. State Management
**File:** `src/components/admin/Sidebar.tsx`

Add a new prop to handle collapsed state:
```typescript
interface SidebarProps {
  isOpen?: boolean          // Mobile drawer state
  onClose?: () => void      // Mobile close handler
  isCollapsed?: boolean      // Desktop collapse state
  onToggleCollapse?: () => void  // Collapse toggle handler
}
```

### 2. Collapsed State Styling
**File:** `src/components/admin/Sidebar.tsx`

Update sidebar width based on collapsed state:
- **Expanded:** `w-64` (256px) - current state
- **Collapsed:** `w-20` (80px) - icon-only state

Apply conditional classes:
```typescript
className={cn(
  'fixed md:sticky top-0 left-0 z-50 bg-gray-900 text-white h-screen flex flex-col',
  'transition-all duration-300 ease-in-out',
  isCollapsed ? 'w-20' : 'w-64'
)}
```

### 3. Navigation Items in Collapsed State
**File:** `src/components/admin/Sidebar.tsx`

When collapsed:
- Hide text labels
- Center icons
- Show tooltips on hover (optional enhancement)
- Adjust padding for icon-only layout

```typescript
<NavLink
  className={({ isActive }) =>
    cn(
      'flex items-center justify-center px-4 py-3 rounded-lg transition-colors min-h-[44px]',
      isCollapsed ? 'justify-center' : 'justify-start space-x-3',
      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    )
  }
>
  <item.icon className="h-5 w-5 flex-shrink-0" />
  {!isCollapsed && <span className="font-medium">{item.name}</span>}
</NavLink>
```

### 4. Header Section in Collapsed State
**File:** `src/components/admin/Sidebar.tsx`

When collapsed:
- Hide logo text
- Center the favicon icon
- Adjust padding

```typescript
<div className={cn(
  "p-4 md:p-6 border-b border-gray-800 flex items-center",
  isCollapsed ? "justify-center" : "justify-between"
)}>
  <div className={cn(
    "flex items-center",
    isCollapsed ? "" : "space-x-3"
  )}>
    <img src="/favicon.svg" alt="EduDock" className="h-8 w-8" />
    {!isCollapsed && (
      <div>
        <h1 className="text-lg md:text-xl font-bold">EduDock</h1>
        <p className="text-xs md:text-sm text-gray-400">Educational Platform</p>
      </div>
    )}
  </div>
  {/* Close button - mobile only */}
  {!isCollapsed && (
    <button onClick={onClose} className="md:hidden ...">
      <X className="h-5 w-5" />
    </button>
  )}
</div>
```

### 5. Footer Section in Collapsed State
**File:** `src/components/admin/Sidebar.tsx`

When collapsed:
- Hide version text
- Show minimal footer or hide entirely

```typescript
{!isCollapsed && (
  <div className="p-4 md:p-6 border-t border-gray-800">
    <div className="text-center text-xs md:text-sm text-gray-400">
      <p>EduDock Educational Platform</p>
      <p className="mt-1">v1.0.0</p>
    </div>
  </div>
)}
```

### 6. Toggle Button
**File:** `src/components/admin/Sidebar.tsx`

Add a collapse/expand toggle button at the bottom of the sidebar:
- Only visible on desktop (`md:flex`)
- Positioned in the footer area
- Uses ChevronLeft/ChevronRight icons

```typescript
import { ChevronLeft, ChevronRight } from 'lucide-react'

{/* Toggle Button - Desktop Only */}
<div className="p-4 md:p-6 border-t border-gray-800">
  <button
    onClick={onToggleCollapse}
    className="hidden md:flex w-full items-center justify-center p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
  >
    {isCollapsed ? (
      <ChevronRight className="h-5 w-5" />
    ) : (
      <ChevronLeft className="h-5 w-5" />
    )}
  </button>
  {!isCollapsed && (
    <div className="text-center text-xs md:text-sm text-gray-400 mt-2">
      <p>EduDock Educational Platform</p>
      <p className="mt-1">v1.0.0</p>
    </div>
  )}
</div>
```

### 7. AdminLayout Integration
**File:** `src/components/admin/AdminLayout.tsx`

Add collapsed state management:
```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState(false)
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

<Sidebar
  isOpen={isSidebarOpen}
  onClose={() => setIsSidebarOpen(false)}
  isCollapsed={isSidebarCollapsed}
  onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
/>
```

### 8. Header Toggle Button (Optional)
**File:** `src/components/admin/Header.tsx`

Add a collapse toggle button in the header for desktop:
```typescript
interface HeaderProps {
  onMenuClick?: () => void
  onToggleSidebarCollapse?: () => void
  isSidebarCollapsed?: boolean
}

// Add button in header (desktop only)
<button
  onClick={onToggleSidebarCollapse}
  className="hidden md:flex p-2 rounded-lg hover:bg-gray-100"
  aria-label="Toggle sidebar"
>
  {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
</button>
```

### 9. Responsive Behavior
**File:** `src/components/admin/Sidebar.tsx`

Ensure collapse functionality only works on desktop:
- Mobile: Always full width when open, off-canvas when closed
- Desktop: Can be collapsed to icon-only state

```typescript
// Apply collapse only on desktop
className={cn(
  'fixed md:sticky top-0 left-0 z-50 bg-gray-900 text-white h-screen flex flex-col',
  'transition-all duration-300 ease-in-out',
  // Mobile: always full width when open
  isOpen ? 'w-64' : '-translate-x-full',
  // Desktop: can be collapsed
  'md:translate-x-0',
  isCollapsed ? 'md:w-20' : 'md:w-64'
)}
```

### 10. CSS Transitions
**File:** `src/components/admin/Sidebar.tsx`

Ensure smooth animations:
- `transition-all duration-300 ease-in-out` on sidebar
- `transition-colors duration-200` on nav items
- `transition-opacity duration-300` on text labels (optional fade effect)

## Implementation Order

1. ✅ Analyze current sidebar implementation
2. ✅ Create detailed plan for roll in/roll out functionality
3. ⏳ Add collapse/expand state management to Sidebar component
4. ⏳ Update Sidebar styling for collapsed (icon-only) state
5. ⏳ Add toggle button for collapse/expand in Sidebar
6. ⏳ Add smooth CSS transitions for roll in/out animation
7. ⏳ Update AdminLayout to handle collapsed sidebar state
8. ⏳ Add optional toggle button in Header component
9. ⏳ Test responsive behavior across screen sizes

## Key Considerations

1. **Accessibility:**
   - Add proper ARIA labels to toggle buttons
   - Ensure keyboard navigation works
   - Maintain focus management

2. **User Experience:**
   - Smooth transitions (300ms)
   - Preserve collapsed state across page navigations (localStorage)
   - Show tooltips on hover when collapsed (optional enhancement)

3. **Responsive Design:**
   - Collapse only on desktop (md breakpoint and above)
   - Mobile behavior remains unchanged
   - Ensure content doesn't overflow in collapsed state

4. **State Persistence (Optional Enhancement):**
   - Save collapsed state to localStorage
   - Restore state on page load
   - Example: `localStorage.setItem('sidebarCollapsed', String(isCollapsed))`

## Files to Modify

1. `src/components/admin/Sidebar.tsx` - Main implementation
2. `src/components/admin/AdminLayout.tsx` - State management
3. `src/components/admin/Header.tsx` - Optional header toggle

## Testing Checklist

- [ ] Sidebar expands/collapses smoothly on desktop
- [ ] Icons remain centered in collapsed state
- [ ] Text labels hide/show correctly
- [ ] Toggle button works and shows correct icon
- [ ] Mobile behavior is unchanged
- [ ] Transitions are smooth (no jank)
- [ ] Keyboard navigation works
- [ ] State persists across page navigations (if implemented)
