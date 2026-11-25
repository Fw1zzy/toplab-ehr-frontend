'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CurrentUser } from '@/types';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { resetDataSession } from '@/lib/api/likha';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, otp?: string) => Promise<void>;
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
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileRequest = useRef(0);
  const signOutRequest = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    const requestId = profileRequest.current;
    async function restoreSession() {
      if (pathname === '/login' || api.auth.hasAccessToken() || !hasAuthCookie()) {
        if (active) setIsLoading(false);
        return;
      }
      const currentUser = await api.auth.refreshSession();
      if (!active || requestId !== profileRequest.current) return;
      if (currentUser) {
        setUser(currentUser as CurrentUser);
        setAuthCookie();
      } else {
        resetDataSession();
        queryClient.clear();
        setUser(null);
        clearAuthCookie();
      }
      if (active) setIsLoading(false);
    }
    // Session restoration can outlive a route change or sign-out.
    void Promise.resolve().then(restoreSession);
    return () => { active = false; };
  }, [pathname, queryClient]);

  const login = useCallback(async (email: string, password: string, otp?: string) => {
    // Finish clearing the old account before accepting a new session.
    if (signOutRequest.current) await signOutRequest.current.catch(() => undefined);
    resetDataSession();
    await queryClient.cancelQueries();
    queryClient.clear();
    const requestId = ++profileRequest.current;
    setUser(null);
    try {
      const result = await api.auth.login(email, password, otp);
      if (requestId !== profileRequest.current) return;
      setUser(result.user as CurrentUser);
      setAuthCookie();
      void api.auth.getCurrentUser().then((profile) => {
        if (profile && profileRequest.current === requestId) setUser(profile);
      });
    } catch (error) {
      if (requestId === profileRequest.current) {
        setUser(null);
        clearAuthCookie();
      }
      throw error;
    }
  }, [queryClient]);

  const updateProfile = useCallback(async (profile: Pick<CurrentUser, 'first_name' | 'last_name'>) => {
    const updatedUser = await api.auth.updateProfile(profile);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(() => {
    if (signOutRequest.current) return signOutRequest.current;
    const request = (async () => {
      profileRequest.current += 1;
      resetDataSession();
      setUser(null);
      clearAuthCookie();
      await queryClient.cancelQueries();
      queryClient.clear();
      try {
        await api.auth.logout();
      } finally {
        setUser(null);
        clearAuthCookie();
      }
    })();
    signOutRequest.current = request;
    void request.finally(() => { if (signOutRequest.current === request) signOutRequest.current = null; }).catch(() => undefined);
    return request;
  }, [queryClient]);

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
