import "./global.css";
import "@/lib/global-error-suppression"; // Must be imported first

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const AppContent = () => {
  // Handle ResizeObserver errors globally
  useResizeObserverErrorHandler();

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('access_token');
    return !!token;
  };

  // Check if this is an admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const isLoginRoute = window.location.pathname === '/login';

  // If not authenticated and not on login or admin routes, show login
  if (!isAuthenticated() && !isAdminRoute && !isLoginRoute) {
    window.location.pathname = '/login';
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter 
          future={{ 
            v7_startTransition: true, 
            v7_relativeSplatPath: true 
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/" element={isAuthenticated() ? <Dashboard /> : <Login />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/projetos" element={<Projects />} />
            <Route path="/tarefas" element={<Tasks />} />
            <Route path="/cobranca" element={<Billing />} />
            <Route path="/recebiveis" element={<Receivables />} />
            <Route path="/fluxo-caixa" element={<CashFlow />} />
            <Route path="/publicacoes" element={<Publications />} />
            <Route path="/publicacoes/:id" element={<PublicationDetail />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/notificacoes" element={<Notifications />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <UIErrorBoundary>
    <AppContent />
  </UIErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
