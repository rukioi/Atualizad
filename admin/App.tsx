import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth';
import { AdminLogin } from './pages/Login';
import { AdminDashboard } from './pages/Dashboard';
import { AdminTenants } from './pages/Tenants';
import { AdminRegistrationKeys } from './pages/RegistrationKeys';

function AdminRoutes() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="dashboard" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/admin/login" replace />} />
      <Route path="tenants" element={isAuthenticated ? <AdminTenants /> : <Navigate to="/admin/login" replace />} />
      <Route path="keys" element={isAuthenticated ? <AdminRegistrationKeys /> : <Navigate to="/admin/login" replace />} />
      <Route path="" element={isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/admin/login" replace />} />
      <Route path="*" element={isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export function AdminApp() {
  return (
    <div className="dark">
      <AdminAuthProvider>
        <AdminRoutes />
      </AdminAuthProvider>
    </div>
  );
}