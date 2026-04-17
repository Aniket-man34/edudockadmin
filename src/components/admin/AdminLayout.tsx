import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm min-h-[calc(100vh-8rem)]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout