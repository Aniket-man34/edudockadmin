/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { loading, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  // Close the mobile sidebar whenever the route changes
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">User not authenticated</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <div className="flex h-full">
        {/* Sidebar (off-canvas drawer on mobile, static on desktop) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full flex flex-col">
          <Header
            onMenuClick={() => setIsSidebarOpen(true)}
            onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
          <main className="flex-1 p-3 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-200/40 min-h-[calc(100vh-7.5rem)]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
