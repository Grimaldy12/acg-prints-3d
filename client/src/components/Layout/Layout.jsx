/* ============================================================
   PrintFlow 3D — Layout Component
   ============================================================
   Sidebar + main content area wrapper.
   Handles mobile sidebar toggle and overlay.
   ============================================================ */

import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button className="mobile-toggle" onClick={openSidebar}>
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main content — child routes render here via Outlet */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
