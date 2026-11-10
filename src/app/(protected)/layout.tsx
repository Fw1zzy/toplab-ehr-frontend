'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isLoading, isAuthenticated } = useRequireAuth();

  if (isLoading) {
    return <BrandLoader label="Opening your workspace" detail="Verifying your secure EHR session" />;
  }

  if (!isAuthenticated) {
    return null; // redirect handled by useRequireAuth
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <Topbar sidebarCollapsed={sidebarCollapsed} onMenuClick={() => setMobileSidebarOpen(true)} />
      <main
        className={cn(
          'min-h-screen min-w-0 pt-14 transition-all duration-300',
          sidebarCollapsed ? 'md:pl-[60px]' : 'md:pl-[228px]',
        )}
      >
        <div className="min-w-0 p-3 sm:p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
