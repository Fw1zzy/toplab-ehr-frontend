'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, HelpCircle, ChevronDown, LogOut, Settings, User, Building2, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface GlobalSearchResult {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
}

const BRANCHES = ['Baguio Branch'];

interface TopbarProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
}

export function Topbar({ sidebarCollapsed, onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('Baguio Branch');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const searchEnabled = searchQuery.length >= 2;
  const patientsQuery = useQuery({
    queryKey: ['global-search', 'patients', searchQuery],
    queryFn: () => api.patients.getAll({ search: searchQuery, limit: 100 }),
    enabled: searchEnabled,
    staleTime: 30_000,
  });
  const companiesQuery = useQuery({
    queryKey: ['global-search', 'companies'],
    queryFn: () => api.companies.getAll(),
    enabled: searchEnabled,
    staleTime: 60_000,
  });
  const encountersQuery = useQuery({
    queryKey: ['global-search', 'encounters'],
    queryFn: () => api.encounters.getAll({ page: 1, limit: 100 }),
    enabled: searchEnabled,
    staleTime: 30_000,
  });
  const invoicesQuery = useQuery({
    queryKey: ['global-search', 'invoices'],
    queryFn: () => api.invoices.getAll({ page: 1, limit: 100 }),
    enabled: searchEnabled,
    staleTime: 30_000,
  });
  const requestsQuery = useQuery({
    queryKey: ['global-search', 'corporate-requests'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
    enabled: searchEnabled,
    staleTime: 30_000,
  });

  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email.split('@')[0]
    : 'User';
  const roleLabel = user?.role
    ? String(user.role).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : '';

  const globalResults = useMemo<GlobalSearchResult[]>(() => {
    if (!searchEnabled) return [];
    const query = searchQuery.toLowerCase();
    const patients = patientsQuery.data?.data ?? [];
    const patientNameById = new Map(patients.map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]));
    const companyNameById = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));
    const results: GlobalSearchResult[] = [];

    for (const patient of patients) {
      results.push({ id: patient.id, kind: 'Patient', title: `${patient.first_name} ${patient.last_name}`.trim(), detail: patient.email ?? patient.contact_number ?? 'Patient record', href: `/patients/${patient.id}` });
    }
    for (const encounter of encountersQuery.data?.data ?? []) {
      const patientId = typeof encounter.patient_id === 'string' ? encounter.patient_id : encounter.patient_id.id;
      const patientName = typeof encounter.patient_id === 'string'
        ? patientNameById.get(patientId) ?? 'Patient encounter'
        : `${encounter.patient_id.first_name ?? ''} ${encounter.patient_id.last_name ?? ''}`.trim() || patientNameById.get(patientId) || 'Patient encounter';
      const detail = [encounter.encounter_type, encounter.service, encounter.status].filter(Boolean).join(' · ');
      if (`${patientName} ${detail}`.toLowerCase().includes(query)) results.push({ id: encounter.id, kind: 'Encounter', title: patientName, detail: detail || 'Encounter record', href: `/encounters/${encounter.id}` });
    }
    for (const invoice of invoicesQuery.data?.data ?? []) {
      const patientId = typeof invoice.patient_id === 'string' ? invoice.patient_id : invoice.patient_id.id;
      const companyName = invoice.company_id ? companyNameById.get(invoice.company_id) ?? '' : '';
      const patientName = patientNameById.get(patientId) ?? '';
      const detail = [companyName || patientName, invoice.status].filter(Boolean).join(' · ');
      const invoiceNumber = invoice.invoice_number ?? 'Invoice';
      if (`${invoiceNumber} ${detail}`.toLowerCase().includes(query)) results.push({ id: invoice.id, kind: 'Invoice', title: invoiceNumber, detail: detail || 'Invoice', href: `/billing/invoices/${invoice.id}` });
    }
    for (const company of companiesQuery.data?.data ?? []) {
      if (company.name.toLowerCase().includes(query)) results.push({ id: company.id, kind: 'Company', title: company.name, detail: company.contract_status, href: `/companies/${company.id}` });
    }
    for (const request of requestsQuery.data?.data ?? []) {
      const companyId = typeof request.company === 'string' ? request.company : request.company.id;
      const companyName = companyNameById.get(companyId) ?? '';
      const title = request.company_code ?? request.request_type;
      const detail = [companyName, request.request_type, request.status].filter(Boolean).join(' · ');
      if (`${title} ${detail}`.toLowerCase().includes(query)) results.push({ id: request.id, kind: 'Corporate Request', title, detail, href: `/corporate-requests/${request.id}` });
    }
    return results.slice(0, 12);
  }, [searchEnabled, searchQuery, patientsQuery.data, encountersQuery.data, invoicesQuery.data, companiesQuery.data, requestsQuery.data]);

  const isSearching = search.trim().length >= 2 && (searchQuery !== search.trim()
    || [patientsQuery, encountersQuery, invoicesQuery, companiesQuery, requestsQuery].some((query) => query.isLoading));

  function selectGlobalResult(result: GlobalSearchResult) {
    router.push(result.href);
    setSearch('');
    setSearchQuery('');
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-2 backdrop-blur-sm transition-all duration-300 sm:gap-3 sm:px-4',
        sidebarCollapsed ? 'md:left-[60px]' : 'md:left-[228px]',
      )}
    >
      <button type="button" onClick={onMenuClick} className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      {/* Search */}
      <div className="relative min-w-0 w-full max-w-xs flex-1">
        <SearchInput value={search} onChange={setSearch} placeholder="Search EHR records..." className="w-full" id="global-search" />
        {search.trim().length >= 2 && <div className="absolute left-0 top-11 z-50 max-h-[min(70vh,30rem)] w-[min(28rem,90vw)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          {isSearching ? <p className="px-4 py-3 text-xs text-slate-500">Searching EHR records...</p> : globalResults.length === 0 ? <p className="px-4 py-3 text-xs text-slate-500">No matching EHR records.</p> : globalResults.map((result) => <button key={`${result.kind}-${result.id}`} type="button" onClick={() => selectGlobalResult(result)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blue-50">
            <span className="mt-0.5 min-w-24 text-[10px] font-semibold uppercase tracking-wide text-blue-600">{result.kind}</span>
            <span className="min-w-0"><span className="block truncate text-xs font-medium text-slate-900">{result.title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{result.detail}</span></span>
          </button>)}
        </div>}
      </div>

      <div className="flex-1" />

      {/* Branch selector */}
      <div className="relative hidden lg:block">
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
        className="relative hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors lg:flex"
        aria-label="Notifications"
        id="notifications-btn"
      >
        <Bell className="h-4.5 w-4.5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-label="3 unread notifications" />
      </button>

      {/* Help */}
      <button
        type="button"
        className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors xl:flex"
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
          <div className="text-left hidden lg:block">
            <p className="text-xs font-semibold text-slate-900 leading-none">{fullName}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5 capitalize">{roleLabel}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block" />
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
                onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
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
