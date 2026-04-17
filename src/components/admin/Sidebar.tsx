import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Wrench,
  Folder,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Sidebar: React.FC = () => {
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
    <aside className="w-64 bg-gray-900 text-white h-screen sticky top-0">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <img src="/favicon.svg" alt="EduDock" className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">EduDock</h1>
            <p className="text-sm text-gray-400">Educational Platform</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
        <div className="text-center text-sm text-gray-400">
          <p>EduDock Educational Platform</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
