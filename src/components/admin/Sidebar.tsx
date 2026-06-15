import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Wrench,
  Folder,
  MessageSquare,
  Search,
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
    { name: 'SEO Settings', path: '/seo', icon: Search },
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
          'fixed md:sticky top-0 left-0 z-50 h-screen flex flex-col text-slate-200',
          'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
          'border-r border-slate-800/80 shadow-xl shadow-black/20',
          'transition-all duration-300 ease-in-out',
          isOpen ? 'w-64' : '-translate-x-full',
          'md:translate-x-0',
          isCollapsed ? 'md:w-20' : 'md:w-64'
        )}
      >
        <div className={cn(
          "p-4 md:p-5 border-b border-slate-800/80 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "" : "space-x-3"
          )}>
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 ring-1 ring-white/10 shadow-md">
              <img src="/favicon.svg" alt="EduDock" className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">EduDock</h1>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-medium">Admin Console</p>
              </div>
            )}
          </div>
          {/* Close button - mobile only */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          {!isCollapsed && (
            <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>
          )}
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-[40px]',
                      isCollapsed ? 'justify-center' : 'justify-start gap-3',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white ring-1 ring-blue-500/30 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !isCollapsed && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-blue-400"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon className={cn(
                        "h-4.5 w-4.5 flex-shrink-0 transition-colors",
                        isActive ? "text-blue-300" : "text-slate-500 group-hover:text-slate-200"
                      )} style={{ width: '1.125rem', height: '1.125rem' }} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          {/* Toggle Button - Desktop Only */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          {!isCollapsed && (
            <div className="text-center text-[11px] text-slate-500 mt-2">
              <p className="font-medium text-slate-400">EduDock Platform</p>
              <p className="mt-0.5">v1.0.0</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
