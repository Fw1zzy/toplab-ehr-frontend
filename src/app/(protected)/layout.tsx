'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isLoading, isAuthenticated } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 animate-pulse" />
          <p className="text-sm text-slate-500">Loading Toplab EHR...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // redirect handled by useRequireAuth
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <Topbar sidebarCollapsed={sidebarCollapsed} />
      <main
        className={cn(
          'pt-14 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-[60px]' : 'pl-[228px]',
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
