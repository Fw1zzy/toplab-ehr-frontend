'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Plus, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useInvoices } from '@/lib/queries/useBillingInventory';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDate, formatCurrency, getPatientFullName } from '@/lib/utils';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

const STATUS_TABS = ['all', 'draft', 'issued', 'unpaid', 'paid'];
const PAGE_SIZE = 10;

export default function BillingPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useInvoices({
    status: statusTab === 'all' ? undefined : statusTab,
    page,
    limit: PAGE_SIZE,
  });

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? invoices.filter((inv: Invoice) => {
        const name = getPatientName(inv.patient_id).toLowerCase();
        return name.includes(search.toLowerCase()) || inv.invoice_number.toLowerCase().includes(search.toLowerCase());
      })
    : invoices;

  // Summary stats
  const totalRevenue = invoices.reduce((s: number, i: Invoice) => s + i.paid_amount, 0);
  const outstanding = invoices.reduce((s: number, i: Invoice) => s + i.balance, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing"
        description="Manage invoices and payment records"
        actions={
          <>
            <button type="button" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors" id="export-invoices-btn">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button type="button" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors" id="create-invoice-btn">
              <Plus className="h-3.5 w-3.5" /> New Invoice
            </button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: total.toString(), color: 'text-slate-900' },
          { label: 'Collected', value: formatCurrency(totalRevenue), color: 'text-emerald-600' },
          { label: 'Outstanding', value: formatCurrency(outstanding), color: 'text-red-600' },
          { label: 'Draft', value: invoices.filter((i: Invoice) => i.status === 'draft').length.toString(), color: 'text-slate-500' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs + table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setStatusTab(tab); setPage(1); }}
                id={`billing-tab-${tab}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors',
                  statusTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab === 'all' ? 'All Invoices' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by patient or invoice #..." className="w-72" id="billing-search" />
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">Unable to load invoices.</div>
        ) : isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices found" description="No invoices match your current filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Invoices table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((inv: Invoice) => {
                    const name = getPatientName(inv.patient_id);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 cursor-pointer transition-colors" onClick={() => router.push(`/billing/invoices/${inv.id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/billing/invoices/${inv.id}`); }}>
                        <td className="px-5 py-3.5 text-xs font-mono text-blue-600 font-medium">{inv.invoice_number}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={name} size="xs" />
                            <span className="text-xs font-medium text-slate-900">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 capitalize">{inv.type}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">{formatDate(inv.invoice_date)}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-900 text-right tabular-nums">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-3.5 text-xs text-right tabular-nums">
                          {inv.balance > 0 ? <span className="text-red-600 font-medium">{formatCurrency(inv.balance)}</span> : <span className="text-emerald-600 font-medium">Settled</span>}
                        </td>
                        <td className="px-4 py-3.5"><StatusBadge status={inv.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} invoices</p>
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
