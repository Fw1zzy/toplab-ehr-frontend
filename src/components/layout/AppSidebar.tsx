'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/lib/auth/PreferencesProvider';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  ListOrdered,
  TestTube,
  Brain,
  CreditCard,
  Receipt,
  Package,
  Settings2,
  BarChart3,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Building2,
  ClipboardCheck,
} from 'lucide-react';
import Image from 'next/image';
import toplabIcon from '@/images/toplab-icon.png';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Patients', href: '/patients', icon: Users },
      { label: 'Appointments', href: '/appointments', icon: CalendarDays },
      { label: 'Encounters', href: '/encounters', icon: ClipboardList },
      { label: 'Laboratory', href: '/laboratory', icon: FlaskConical },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { label: 'Patient Queue', href: '/queue', icon: ListOrdered },
      { label: 'Lab Results', href: '/lab-results', icon: TestTube },
      { label: 'AI Clinical Tools', href: '/ai-clinical-tools', icon: Brain },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Billing', href: '/billing', icon: CreditCard },
      { label: 'Invoices', href: '/billing/invoices', icon: Receipt },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Services', href: '/services', icon: Activity },
      { label: 'Staff', href: '/staff', icon: Users },
    ],
  },
  {
    title: 'Corporate',
    items: [
      { label: 'Companies', href: '/companies', icon: Building2 },
      { label: 'Corporate Requests', href: '/corporate-requests', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Analytics Dashboard', href: '/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/reports', icon: FileBarChart },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings2 },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { preferences } = usePreferences();
  const isCollapsed = collapsed && !mobileOpen;
  const navGroups = useMemo(() => NAV_GROUPS.map((group) => ({
    ...group,
    items: [...group.items].sort((left, right) => preferences.navigationOrder.indexOf(left.href) - preferences.navigationOrder.indexOf(right.href)),
  })), [preferences.navigationOrder]);
  const activeHref = navGroups.flatMap((group) => group.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  function isActive(href: string): boolean {
    return href === activeHref;
  }

  return (
    <>
    {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onMobileClose} className="fixed inset-0 z-30 bg-slate-950/35 md:hidden" />}
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-slate-200 bg-white transition-all duration-300 md:translate-x-0',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
      collapsed ? 'md:w-[60px]' : 'md:w-[228px]',
    )}>
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-14 border-b border-slate-100 flex-shrink-0',
          isCollapsed ? 'justify-center px-0' : 'px-4 gap-2.5',
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
          <Image src={toplabIcon} alt="Toplab" width={24} height={24} className="h-auto w-6 object-contain" />
        </div>
        {!isCollapsed && (
          <div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">Toplab</span>
            <span className="block text-[10px] text-slate-400 leading-none">EHR System</span>
          </div>
        )}
        <button type="button" onClick={onMobileClose} aria-label="Close navigation" className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"><X className="h-4 w-4" /></button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
          {navGroups.map((group) => (
          <div key={group.title} className={cn('mb-3', isCollapsed ? 'px-1.5' : 'px-3')}>
            {!isCollapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
            )}
            <ul role="list" className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        isCollapsed && 'justify-center px-0',
                      )}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={onMobileClose}
                    >
                      <item.icon
                        className={cn(
                          'h-4.5 w-4.5 flex-shrink-0',
                          active ? 'text-blue-600' : 'text-slate-400',
                        )}
                        strokeWidth={active ? 2.5 : 2}
                        aria-hidden="true"
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="hidden flex-shrink-0 border-t border-slate-100 p-2 md:block">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex w-full items-center rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors',
            isCollapsed ? 'justify-center' : 'gap-2',
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
