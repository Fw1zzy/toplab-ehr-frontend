'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CurrentUser } from '@/types';
import { api } from '@/lib/api';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  updateProfile: (profile: Pick<CurrentUser, 'first_name' | 'last_name'>) => Promise<void>;
  logout: () => Promise<void>;
  role: CurrentUser['roleName'] | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_COOKIE = 'toplab_auth';

/** Set a plain JS cookie so the proxy.ts edge function can gate protected routes */
function setAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; SameSite=Strict`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}

function hasAuthCookie() {
  return document.cookie.split(';').some((cookie) => cookie.trim() === `${AUTH_COOKIE}=1`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileRequest = useRef(0);

  useEffect(() => {
    if (pathname === '/login' || api.auth.hasAccessToken() || !hasAuthCookie()) {
      setIsLoading(false);
      return;
    }

    let active = true;
    api.auth.refreshSession().then((currentUser) => {
      if (!active) return;
      if (currentUser) {
        setUser(currentUser as CurrentUser);
        setAuthCookie();
      } else clearAuthCookie();
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [pathname]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await api.auth.login(email, password);
      setUser(result.user as CurrentUser);
      setAuthCookie();
      const requestId = ++profileRequest.current;
      void api.auth.getCurrentUser().then((profile) => {
        if (profile && profileRequest.current === requestId) setUser(profile);
      });
    } catch (error) {
      setUser(null);
      clearAuthCookie();
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (profile: Pick<CurrentUser, 'first_name' | 'last_name'>) => {
    const updatedUser = await api.auth.updateProfile(profile);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(async () => {
    profileRequest.current += 1;
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
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
        updateProfile,
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
