'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, HelpCircle, ChevronDown, LogOut, Settings, User, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/utils';

const BRANCHES = ['Main Branch', 'Branch 2', 'Branch 3'];

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export function Topbar({ sidebarCollapsed }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('Main Branch');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const fullName = user ? `${user.first_name} ${user.last_name}` : 'User';
  const roleLabel = user?.role
    ? String(user.role).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : '';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 transition-all duration-300',
        sidebarCollapsed ? 'left-[60px]' : 'left-[228px]',
      )}
    >
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search patients, records, invoices..."
        className="w-64 max-w-xs"
        id="global-search"
      />

      <div className="flex-1" />

      {/* Branch selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowBranchMenu((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          id="branch-selector"
          aria-haspopup="true"
          aria-expanded={showBranchMenu}
        >
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>{branch}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>

        {showBranchMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowBranchMenu(false)} />
            <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => { setBranch(b); setShowBranchMenu(false); }}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors',
                    b === branch ? 'font-semibold text-blue-600' : 'text-slate-700',
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
        id="notifications-btn"
      >
        <Bell className="h-4.5 w-4.5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-label="3 unread notifications" />
      </button>

      {/* Help */}
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Help"
        id="help-btn"
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowUserMenu((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors"
          id="user-menu-btn"
          aria-haspopup="true"
          aria-expanded={showUserMenu}
        >
          <Avatar name={fullName} size="sm" />
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-none">{fullName}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5 capitalize">{roleLabel}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{fullName}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => { router.push('/settings'); setShowUserMenu(false); }}
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                Profile
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => { router.push('/settings'); setShowUserMenu(false); }}
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                Settings
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                id="logout-btn"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
