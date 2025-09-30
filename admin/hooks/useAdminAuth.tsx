import React, { useState, useEffect, createContext, useContext } from "react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "super_admin";
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("admin_access_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Handle mock token
      if (token.startsWith("mock-admin-token")) {
        console.log('Using mock admin token');
        const mockUser = {
          id: "admin-1",
          email: "admin@legalsaas.com",
          name: "Administrator",
          role: "admin" as const,
        };
        setUser(mockUser);
        setIsLoading(false);
        return;
      }

      // Try real API if available
      try {
        const response = await fetch("/api/admin/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        } else {
          localStorage.removeItem("admin_access_token");
          localStorage.removeItem("admin_refresh_token");
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_refresh_token");
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Clear any existing tokens first
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("admin_refresh_token");
    
    // Mock authentication for development
    if (email === "admin@legalsaas.com" && password === "admin123456") {
      const mockUser = {
        id: "admin-1",
        email: "admin@legalsaas.com",
        name: "Admin User",
        role: "admin" as const,
      };

      const mockToken = "mock-admin-token-" + Date.now();

      localStorage.setItem("admin_access_token", mockToken);
      localStorage.setItem("admin_refresh_token", "mock-refresh-token");

      setUser(mockUser);
      return;
    }

    // Try real API if available
    try {
      console.log('Attempting admin login via API:', email);
      
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Admin API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Admin login API error:', errorData);
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      console.log('Admin login successful:', data);

      localStorage.setItem("admin_access_token", data.tokens.accessToken);
      localStorage.setItem("admin_refresh_token", data.tokens.refreshToken);

      setUser(data.user);
    } catch (error) {
      console.error('Admin login failed:', error);
      throw new Error("Invalid credentials");
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("admin_access_token");
      if (token) {
        await fetch("/api/admin/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      setUser(null);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
