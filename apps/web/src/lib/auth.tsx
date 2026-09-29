"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API_BASE_URL } from "./demo-api";
import { useRouter, usePathname } from "next/navigation";

export interface Membership {
  project_id: string;
  project_name: string;
  role: string;
  reporting_scope: string | null;
  discipline: string | null;
  area: string | null;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  memberships: Membership[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  activeProject: Membership | null;
  setActiveProjectId: (id: string) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem("execlink_token");
    if (storedToken) {
      setToken(storedToken);
      fetchMe(storedToken);
    } else {
      setIsLoading(false);
      if (pathname !== "/login") {
        router.push("/login");
      }
    }
  }, []);

  const fetchMe = async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${currentToken}` }
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      
      const userData: User = await res.json();
      setUser(userData);
      
      // Default to PRJ-DEMO-001 if available, else first membership
      const defaultProj = userData.memberships.find(m => m.project_id === "PRJ-DEMO-001") || userData.memberships[0];
      if (defaultProj) setActiveProjectId(defaultProj.project_id);
      
      setIsLoading(false);
      if (pathname === "/login") {
        router.push("/");
      }
    } catch (error) {
      console.error(error);
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Email or password is incorrect.");
    }
    localStorage.setItem("execlink_token", data.token);
    setToken(data.token);
    await fetchMe(data.token);
  };

  const logout = () => {
    localStorage.removeItem("execlink_token");
    setToken(null);
    setUser(null);
    setActiveProjectId(null);
    setIsLoading(false);
    router.push("/login");
  };

  const activeProject = user?.memberships.find(m => m.project_id === activeProjectId) || null;

  const hasPermission = (permission: string) => {
    return activeProject?.permissions.includes(permission) || false;
  };

  // Intercept 401s from window fetch
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        logout();
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, activeProject, setActiveProjectId, hasPermission }}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)', color: 'var(--text-muted)' }}>
          Loading ExecLink...
        </div>
      ) : (
        (!user && pathname !== "/login") ? null : children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
