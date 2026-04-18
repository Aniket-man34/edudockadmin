import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Wrench,
  Folder,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Manage PDFs', path: '/pdfs', icon: FileText },
    { name: 'Manage Updates', path: '/updates', icon: Megaphone },
    { name: 'Manage Tools', path: '/tools', icon: Wrench },
    { name: 'Manage Categories', path: '/categories', icon: Folder },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 bg-gray-900 text-white h-screen flex flex-col',
          'transition-all duration-300 ease-in-out',
          // Mobile: always full width when open
          isOpen ? 'w-64' : '-translate-x-full',
          // Desktop: can be collapsed
          'md:translate-x-0',
          isCollapsed ? 'md:w-20' : 'md:w-64'
        )}
      >
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
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-4 py-3 rounded-lg transition-colors min-h-[44px]',
                      isCollapsed ? 'justify-center' : 'justify-start space-x-3',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 md:p-6 border-t border-gray-800">
          {/* Toggle Button - Desktop Only */}
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
      </aside>
    </>
  )
}

export default Sidebar
