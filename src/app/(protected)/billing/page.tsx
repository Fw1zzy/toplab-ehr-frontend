'use client';

import { useState } from 'react';
import { Receipt, Plus, Download, CreditCard, CircleDollarSign, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useInvoices } from '@/lib/queries/useBillingInventory';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { formatCurrency } from '@/lib/utils';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { NewInvoiceDialog } from '@/components/billing/NewInvoiceDialog';
import { usePreferences } from '@/lib/auth/PreferencesProvider';

function getPatientName(patientId: string | object, names: Map<string, string>, loading: boolean): string {
  if (typeof patientId === 'object' && patientId) {
    const patient = patientId as { first_name?: string; last_name?: string; id?: string };
    return [patient.first_name, patient.last_name].filter(Boolean).join(' ') || names.get(patient.id ?? '') || (loading ? 'Loading patient...' : 'Unknown patient');
  }
  return names.get(patientId) ?? (loading ? 'Loading patient...' : 'Unknown patient');
}

const STATUS_TABS = ['all', 'draft', 'issued', 'unpaid', 'paid'];

export default function BillingPage() {
  const { preferences } = usePreferences();
  const PAGE_SIZE = preferences.rowsPerPage;
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [page, setPage] = useState(1);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);

  const { data, isLoading, error } = useInvoices({ page: 1, limit: 100 });
  const patientsQuery = usePatients({ limit: 100 });
  const companiesQuery = useCompanies();

  const allInvoices = data?.data ?? [];
  const patientNames = new Map((patientsQuery.data?.data ?? []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]));
  const companyNames = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));
  const statusFiltered = statusTab === 'all' ? allInvoices : allInvoices.filter((invoice) => invoice.status === statusTab);

  const filtered = search.trim()
    ? statusFiltered.filter((inv: Invoice) => {
        const patientName = getPatientName(inv.patient_id, patientNames, patientsQuery.isLoading).toLowerCase();
        const companyName = inv.company_id ? companyNames.get(inv.company_id) ?? '' : '';
        return patientName.includes(search.toLowerCase())
          || companyName.toLowerCase().includes(search.toLowerCase())
          || (inv.invoice_number ?? '').toLowerCase().includes(search.toLowerCase());
      })
    : statusFiltered;

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pagedInvoices = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paidInvoiceValue = allInvoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total_amount, 0);
  const issuedUnpaidValue = allInvoices.filter((invoice) => invoice.status === 'issued' || invoice.status === 'unpaid').reduce((sum, invoice) => sum + invoice.total_amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing"
        description="Review invoice amounts and statuses from the EHR."
        actions={
          <>
            <button type="button" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors" id="export-invoices-btn">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button type="button" onClick={() => setNewInvoiceOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors" id="create-invoice-btn">
              <Plus className="h-3.5 w-3.5" /> New Invoice
            </button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={data?.total ?? 0} icon={Receipt} iconColor="text-blue-600" subtitle="From EHR" />
        <StatCard title="Paid Invoice Value" value={paidInvoiceValue} icon={CircleDollarSign} iconColor="text-emerald-600" isCurrency subtitle="Invoices marked paid" />
        <StatCard title="Issued / Unpaid Value" value={issuedUnpaidValue} icon={Wallet} iconColor="text-amber-600" isCurrency subtitle="Based on invoice status" />
        <StatCard title="Draft" value={allInvoices.filter((invoice) => invoice.status === 'draft').length} icon={CreditCard} iconColor="text-slate-500" />
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
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by patient, company, or invoice #..." className="w-72" id="billing-search" />
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Billed To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Total Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagedInvoices.map((inv: Invoice) => {
                    const name = getPatientName(inv.patient_id, patientNames, patientsQuery.isLoading);
                    const billedTo = inv.company_id ? companyNames.get(inv.company_id) ?? 'Unknown company' : name;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-xs font-mono text-blue-600 font-medium">{inv.invoice_number ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={name} size="xs" />
                            <span className="text-xs font-medium text-slate-900">{billedTo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{inv.type ?? '—'}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-900 text-right tabular-nums">{formatCurrency(inv.total_amount)}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={inv.status ?? 'unknown'} /></td>
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
      <NewInvoiceDialog open={newInvoiceOpen} onOpenChange={setNewInvoiceOpen} />
    </div>
  );
}
