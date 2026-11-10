'use client';

import { useState } from 'react';
import { AlertTriangle, Package, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatCard } from '@/components/ui/StatCard';
import { AddInventoryItemForm } from '@/components/inventory/AddInventoryItemForm';
import { useInventory } from '@/lib/queries/useBillingInventory';
import { InventoryItem } from '@/types';
import { usePreferences } from '@/lib/auth/PreferencesProvider';

const STATUS_FILTERS = [
  { value: '', label: 'All Stock Statuses' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
] as const;

export default function InventoryPage() {
  const { preferences } = usePreferences();
  const PAGE_SIZE = preferences.rowsPerPage;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, error } = useInventory({ search, status: statusFilter || undefined, page, limit: PAGE_SIZE });
  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const lowStockCount = items.filter((item) => item.status === 'low_stock').length;
  const outOfStockCount = items.filter((item) => item.status === 'out_of_stock').length;

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Inventory" description="Stock quantities, units, and reorder levels from the EHR." actions={
        <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Add Item</button>
      } />

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        <StatCard title="Inventory Items" value={data?.total ?? 0} icon={Package} iconColor="text-blue-600" subtitle="EHR records" />
        <StatCard title="Low Stock" value={lowStockCount} icon={AlertTriangle} iconColor="text-amber-600" subtitle="On this page" />
        <StatCard title="Out of Stock" value={outOfStockCount} icon={AlertTriangle} iconColor="text-red-600" subtitle="On this page" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search inventory items..." aria-label="Search inventory" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
          </div>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" aria-label="Filter by stock status">
            {STATUS_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {error ? <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to load inventory from the EHR.</p> : isLoading ? <TableSkeleton rows={6} cols={4} /> : items.length === 0 ? (
          <EmptyState icon={Package} title="No inventory items found" description={search || statusFilter ? 'Try adjusting your search or stock-status filter.' : 'No inventory records were returned by the EHR.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="EHR inventory">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Current Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Reorder Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Stock Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item: InventoryItem) => <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-900">{item.name}</p><p className="mt-0.5 text-[10px] text-slate-400">Unit: {item.unit || '—'}</p></td>
                    <td className="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-800">{item.current_stock} {item.unit}</td>
                    <td className="px-4 py-3.5 text-right text-xs tabular-nums text-slate-600">{item.minimum_stock} {item.unit}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={item.status} /></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">{total} items</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-7 rounded-md border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                <span className="px-1 py-1 text-xs text-slate-500">Page {page} of {Math.max(1, totalPages)}</span>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="h-7 rounded-md border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>
      <AddInventoryItemForm open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
