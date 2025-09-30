
import "./global.css";
import "@/lib/global-error-suppression"; // Must be imported first

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { CRM } from "./pages/CRM";
import { Projects } from "./pages/Projects";
import { AdminApp } from "@admin/App";
import { Tasks } from "./pages/Tasks";
import { Billing } from "./pages/Billing";
import { Receivables } from "./pages/Receivables";
import { CashFlow } from "./pages/CashFlow";
import { Publications } from "./pages/Publications";
import { PublicationDetail } from "./pages/PublicationDetail";
import { Settings } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { Login } from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AccessDenied } from "./pages/AccessDenied";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { initializeResizeObserverFix } from "@/lib/resize-observer-fix";
import {
  UIErrorBoundary,
  useResizeObserverErrorHandler,
} from "@/lib/error-boundary";

// Initialize ResizeObserver error suppression
initializeResizeObserverFix();

const queryClient = new QueryClient();

// Global logout function
(window as any).logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Handle ResizeObserver errors globally
  useResizeObserverErrorHandler();

  // Check if this is an admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  // Show loading while checking authentication
  if (isLoading && !isAdminRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // For admin routes, don't check main authentication
  if (isAdminRoute) {
    return (
      <BrowserRouter 
        future={{ 
          v7_startTransition: true, 
          v7_relativeSplatPath: true 
        }}
      >
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/acesso-negado" element={<AccessDenied />} />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/crm" 
          element={
            <ProtectedRoute><CRM /></ProtectedRoute>
          } 
        />
        <Route 
          path="/projetos" 
          element={
            <ProtectedRoute><Projects /></ProtectedRoute>
          } 
        />
        <Route 
          path="/tarefas" 
          element={
            <ProtectedRoute><Tasks /></ProtectedRoute>
          } 
        />
        <Route 
          path="/cobranca" 
          element={
            <ProtectedRoute><Billing /></ProtectedRoute>
          } 
        />
        <Route 
          path="/recebiveis" 
          element={
            <ProtectedRoute><Receivables /></ProtectedRoute>
          } 
        />
        <Route 
          path="/fluxo-caixa" 
          element={
            <ProtectedRoute requiredAccountTypes={['COMPOSTA', 'GERENCIAL']}>
              <CashFlow />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/publicacoes" 
          element={
            <ProtectedRoute><Publications /></ProtectedRoute>
          } 
        />
        <Route 
          path="/publicacoes/:id" 
          element={
            <ProtectedRoute><PublicationDetail /></ProtectedRoute>
          } 
        />
        <Route 
          path="/configuracoes" 
          element={
            <ProtectedRoute requiredAccountTypes={['GERENCIAL']}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notificacoes" 
          element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } 
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const AppContent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <UIErrorBoundary>
    <AppContent />
  </UIErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
