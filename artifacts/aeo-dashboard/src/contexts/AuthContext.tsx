import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoaded: boolean;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: false,
  refetch: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setLocation] = useLocation();

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // Admin/owner accounts that land on the portal SPA get bounced to the
        // separate admin CloudFront distribution (different origin / cookie jar).
        if (data?.role === "admin" || data?.role === "owner") {
          const adminUrl = import.meta.env.VITE_ADMIN_URL || null;
          if (adminUrl) {
            window.location.href = adminUrl;
          } else {
            console.warn("Admin role detected on portal but VITE_ADMIN_URL not set");
            setUser(null);
          }
          return;
        }
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setLocation("/sign-in");
  }, [setLocation]);

  return (
    <AuthContext.Provider value={{ user, isLoaded, refetch: fetchMe, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
