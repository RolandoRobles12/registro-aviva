// src/components/layout/AdminLayout.tsx - Versión corregida
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AdminSidebar } from './AdminSidebar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for mobile */}
      <AdminSidebar
        isMobile={true}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Static sidebar for desktop */}
      <AdminSidebar />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
          isAdmin={true}
        />

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}