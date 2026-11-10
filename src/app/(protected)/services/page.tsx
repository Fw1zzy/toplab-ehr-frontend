'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, DollarSign, Download, Plus, Search, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { AddServiceForm } from '@/components/services/AddServiceForm';
import { api } from '@/lib/api';
import { CatalogService } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { usePreferences } from '@/lib/auth/PreferencesProvider';

function resultLabel(collection: string) {
  return collection.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function linkedResultLabels(service: CatalogService) {
  const linked = (service.linked_collection ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  return [...new Set([...(service.lab_results ?? []), ...linked])];
}

export default function ServicesPage() {
  const { preferences } = usePreferences();
  const PAGE_SIZE = preferences.rowsPerPage;
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['catalog-services'], queryFn: () => api.services.getAll(),
  });

  const departments = useMemo(() => [...new Set(services.map((service) => service.department).filter((value): value is string => Boolean(value)))].sort(), [services]);
  const filtered = services.filter((service: CatalogService) => {
    const haystack = [service.name, service.department, service.description, service.linked_collection, ...(service.lab_results ?? [])].join(' ').toLowerCase();
    return (!search || haystack.includes(search.toLowerCase()))
      && (department === 'all' || service.department === department)
      && (statusFilter === 'all' || service.status === statusFilter);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visibleServices = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const availableCount = services.filter((service) => service.status === 'available').length;
  const unavailableCount = services.filter((service) => service.status === 'unavailable').length;
  const averagePrice = services.length ? services.reduce((sum, service) => sum + service.price, 0) / services.length : 0;

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Services" description={`${services.length} services in the EHR catalog`} actions={
        <div className="flex items-center gap-2">
          <button type="button" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Export</button>
          <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Add Service</button>
        </div>
      } />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Catalog Services" value={services.length} icon={Activity} iconColor="text-blue-600" subtitle="From the EHR" />
        <StatCard title="Available" value={availableCount} icon={Activity} iconColor="text-emerald-600" subtitle="Offered to patients" />
        <StatCard title="Not Available" value={unavailableCount} icon={XCircle} iconColor="text-slate-500" subtitle="Currently unavailable" />
        <StatCard title="Average Price" value={averagePrice} icon={DollarSign} iconColor="text-violet-600" isCurrency subtitle="Across catalog services" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto border-b border-slate-100">
          <nav className="flex" aria-label="Filter services by department">
            {[{ value: 'all', label: 'All Departments' }, ...departments.map((value) => ({ value, label: value }))].map((item) => <button key={item.value} type="button" onClick={() => { setDepartment(item.value); setPage(1); }} className={cn('whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium capitalize transition-colors', department === item.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>{item.label}</button>)}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput value={search} onChange={updateSearch} placeholder="Search service, department, or result..." className="w-72" id="service-search" />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" aria-label="Filter by service status">
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="unavailable">Not Available</option>
          </select>
        </div>

        {error ? <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to load services from the EHR.</p> : isLoading ? <p className="p-8 text-center text-sm text-slate-500">Loading services...</p> : visibleServices.length === 0 ? (
          <EmptyState icon={Activity} title="No services found" description={search || statusFilter !== 'all' || department !== 'all' ? 'Try adjusting your search or filters.' : 'Add a service to get started.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="EHR service catalog">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Result Collections</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleServices.map((service) => <tr key={service.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-900">{service.name}</p><p className="mt-0.5 max-w-sm truncate text-[10px] text-slate-400">{service.description ?? ''}</p></td>
                    <td className="px-4 py-3.5 text-xs capitalize text-slate-600">{service.department ?? '—'}</td>
                    <td className="max-w-sm px-4 py-3.5 text-xs text-slate-600">{linkedResultLabels(service).length ? linkedResultLabels(service).map(resultLabel).join(', ') : '—'}</td>
                    <td className="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-900">{formatCurrency(service.price)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={service.status} /></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} services</p>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-7 rounded-md border border-slate-200 px-3 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <span className="px-1 text-xs text-slate-500">Page {page} of {Math.max(1, totalPages)}</span>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="h-7 rounded-md border border-slate-200 px-3 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      <AddServiceForm open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
