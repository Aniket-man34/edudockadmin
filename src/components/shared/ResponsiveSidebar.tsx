import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Wrench,
  Folder,
  MessageSquare,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ResponsiveSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      // Removed isMobile logic
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('responsive-sidebar')
      const toggle = document.getElementById('sidebar-toggle')

      if (
        sidebar &&
        toggle &&
        !sidebar.contains(event.target as Node) &&
        !toggle.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Manage PDFs',
      path: '/pdfs',
      icon: FileText,
    },
    {
      name: 'Manage Updates',
      path: '/updates',
      icon: Megaphone,
    },
    {
      name: 'Manage Tools',
      path: '/tools',
      icon: Wrench,
    },
    {
      name: 'Manage Categories',
      path: '/categories',
      icon: Folder,
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: MessageSquare,
    },
  ]

  return (
    <>
      {/* Toggle Button - Vertical Three Dots */}
      <button
        id="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-gray-900 text-white p-3 rounded-r-lg shadow-lg transition-all duration-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500",
          isOpen ? "translate-x-64" : "translate-x-0"
        )}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="flex flex-col space-y-1.5">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </div>
        )}
      </button>

      {/* Sidebar */}
      <aside
        id="responsive-sidebar"
        className={cn(
          "fixed top-0 left-0 h-screen bg-gray-900 text-white z-40 transition-transform duration-300 ease-in-out shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <img src="/favicon.svg" alt="EduDock" className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">EduDock</h1>
                <p className="text-sm text-gray-400">Educational Platform</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-800">
            <div className="text-center text-sm text-gray-400">
              <p>EduDock Educational Platform</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-30 transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default ResponsiveSidebar
