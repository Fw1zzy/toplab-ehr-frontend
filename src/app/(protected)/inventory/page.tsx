'use client';

import { useState } from 'react';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useInventory } from '@/lib/queries/useBillingInventory';
import { formatDate, formatCurrency } from '@/lib/utils';
import { InventoryItem } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Items' },
  { id: 'reagent', label: 'Reagents' },
  { id: 'supply', label: 'Supplies' },
  { id: 'medicine', label: 'Medicine' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'consumable', label: 'Consumables' },
];

const PAGE_SIZE = 10;

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useInventory({
    search,
    category: category === 'all' ? undefined : category,
    status: statusFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const lowStockCount = items.filter((i: InventoryItem) => i.status === 'low_stock').length;
  const outOfStockCount = items.filter((i: InventoryItem) => i.status === 'out_of_stock').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Track laboratory reagents, supplies, and equipment"
        actions={
          <button type="button" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors" id="add-item-btn">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
        }
      />

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>{outOfStockCount} item(s) out of stock</strong> and <strong>{lowStockCount} item(s) at low stock</strong> on this page. Consider restocking.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Items', value: total, color: 'text-slate-900' },
          { label: 'Low Stock', value: lowStockCount, color: 'text-amber-600' },
          { label: 'Out of Stock', value: outOfStockCount, color: 'text-red-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Category tabs + table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setCategory(tab.id); setPage(1); }}
                id={`inv-cat-${tab.id}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                  category === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search items..." className="w-64" id="inventory-search" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Filter by stock status"
          >
            <option value="">All statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">Unable to load inventory.</div>
        ) : isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : items.length === 0 ? (
          <EmptyState icon={Package} title="No items found" description="No inventory items match your filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Inventory table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Current Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Min Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Branch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item: InventoryItem) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                        {item.supplier && <p className="text-[10px] text-slate-400 mt-0.5">{item.supplier}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{item.item_code}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cn(
                          'text-xs font-bold tabular-nums',
                          item.current_stock === 0 ? 'text-red-600' : item.current_stock <= item.minimum_stock ? 'text-amber-600' : 'text-slate-900',
                        )}>
                          {item.current_stock} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-400 tabular-nums">{item.minimum_stock} {item.unit}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">{item.expiry_date ? formatDate(item.expiry_date) : '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{item.branch ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} items</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Previous</button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
