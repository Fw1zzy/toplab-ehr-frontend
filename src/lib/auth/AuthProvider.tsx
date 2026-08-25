'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CurrentUser } from '@/types';
import { api } from '@/lib/api';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  role: CurrentUser['roleName'] | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'toplab_session';
const AUTH_COOKIE = 'toplab_auth';

/** Set a plain JS cookie so the proxy.ts edge function can gate protected routes */
function setAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; SameSite=Strict`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}

// ---------------------------------------------------------------------------
// Dev bypass — set NEXT_PUBLIC_BYPASS_AUTH=true in .env to skip login
// ---------------------------------------------------------------------------
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

const MOCK_USER: CurrentUser = {
  id: 'bypass-user',
  first_name: 'Dev',
  last_name: 'User',
  email: 'dev@toplab.local',
  avatar: null,
  role: 'administrator',
  roleName: 'administrator',
  status: 'active',
  last_access: null,
  last_page: null,
  permissions: [],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(BYPASS_AUTH ? MOCK_USER : null);
  const [isLoading, setIsLoading] = useState(!BYPASS_AUTH);

  useEffect(() => {
    // When auth bypass is active, immediately set the cookie so the proxy
    // middleware also allows through, then mark loading as done.
    if (BYPASS_AUTH) {
      setAuthCookie();
      setIsLoading(false);
      return;
    }

    // Rehydrate from sessionStorage on mount (client only)
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CurrentUser;
        setUser(parsed);
        // Re-assert the cookie so the proxy keeps allowing access
        setAuthCookie();
      }
    } catch {
      // ignore parse errors — treat as unauthenticated
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    const currentUser = result.user as CurrentUser;
    setUser(currentUser);
    // Persist user object in sessionStorage (cleared on tab close)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    // Set the cookie BEFORE router.replace so the proxy sees it immediately
    setAuthCookie();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_KEY);
      clearAuthCookie();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        role: user?.roleName ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
