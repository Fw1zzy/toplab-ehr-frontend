'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  FileText,
  ListOrdered,
  Stethoscope,
  TestTube,
  Brain,
  CreditCard,
  Receipt,
  Banknote,
  Package,
  Settings2,
  BarChart3,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  Activity,
  Cpu,
} from 'lucide-react';
import Image from 'next/image';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Patients', href: '/patients', icon: Users },
      { label: 'Appointments', href: '/appointments', icon: CalendarDays },
      { label: 'Encounters', href: '/encounters', icon: ClipboardList },
      { label: 'Laboratory', href: '/laboratory', icon: FlaskConical },
      { label: 'Medical Records', href: '/medical-records', icon: FileText },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { label: 'Patient Queue', href: '/queue', icon: ListOrdered },
      { label: 'Treatments', href: '/treatments', icon: Stethoscope },
      { label: 'Lab Results', href: '/lab-results', icon: TestTube },
      { label: 'AI Clinical Tools', href: '/ai-clinical-tools', icon: Brain },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Billing', href: '/billing', icon: CreditCard },
      { label: 'Invoices', href: '/billing/invoices', icon: Receipt },
      { label: 'Payments', href: '/payments', icon: Banknote },
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
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[228px]',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-14 border-b border-slate-100 flex-shrink-0',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2.5',
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
          <Cpu className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">Toplab</span>
            <span className="block text-[10px] text-slate-400 leading-none">EHR System</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className={cn('mb-3', collapsed ? 'px-1.5' : 'px-3')}>
            {!collapsed && (
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
                        collapsed && 'justify-center px-0',
                      )}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon
                        className={cn(
                          'h-4.5 w-4.5 flex-shrink-0',
                          active ? 'text-blue-600' : 'text-slate-400',
                        )}
                        strokeWidth={active ? 2.5 : 2}
                        aria-hidden="true"
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="flex-shrink-0 border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex w-full items-center rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors',
            collapsed ? 'justify-center' : 'gap-2',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
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
  );
}
