'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useInvoices } from '@/lib/queries/useBillingInventory';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDate, getPatientFullName } from '@/lib/utils';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

function getPatientFirstName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p?.first_name ?? '';
}

function getPatientLastName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p?.last_name ?? '';
}

// Mock company data based on company_id references
const COMPANIES: Record<string, string> = {
  'company-001': 'Zyberlab IT Solutions',
  'company-002': 'adrescompany, adrescomp...',
};

const INVOICE_TABS = [
  { id: 'corporate', label: 'Corporate Invoices' },
  { id: 'outpatient', label: 'Outpatient Invoices' },
];

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('corporate');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useInvoices({ page: 1, limit: 100 });

  const allInvoices = data?.data ?? [];

  // Filter by tab type
  const tabInvoices = activeTab === 'corporate'
    ? allInvoices.filter((inv: Invoice) => inv.type === 'company')
    : allInvoices.filter((inv: Invoice) => inv.type !== 'company');

  // Apply search
  const filtered = search
    ? tabInvoices.filter((inv: Invoice) => {
        if (activeTab === 'corporate') {
          const companyName = inv.company_id ? COMPANIES[inv.company_id as string] ?? '' : '';
          return (
            companyName.toLowerCase().includes(search.toLowerCase()) ||
            inv.invoice_number.toLowerCase().includes(search.toLowerCase())
          );
        } else {
          const name = getPatientName(inv.patient_id).toLowerCase();
          return (
            name.includes(search.toLowerCase()) ||
            inv.invoice_number.toLowerCase().includes(search.toLowerCase())
          );
        }
      })
    : tabInvoices;

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Manage corporate and outpatient invoices"
      />

      {/* Main container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Tab navigation */}
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {INVOICE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                  setSearch('');
                }}
                id={`invoice-tab-${tab.id}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              activeTab === 'corporate'
                ? 'Search by company or invoice #...'
                : 'Search by patient or invoice #...'
            }
            className="w-72"
            id="invoices-search"
          />
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Unable to load invoices.
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description="No invoices match your current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              {activeTab === 'corporate' ? (
                /* Corporate Invoices Table */
                <table
                  className="w-full text-sm"
                  aria-label="Corporate invoices table"
                >
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Invoice Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map((inv: Invoice) => {
                      const companyName =
                        inv.company_id
                          ? COMPANIES[inv.company_id as string] ?? inv.company_id
                          : '—';
                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-xs font-medium text-blue-600">
                            {companyName}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-slate-700">
                            {inv.invoice_number}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 capitalize">
                            Corporate
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* Outpatient Invoices Table */
                <table
                  className="w-full text-sm"
                  aria-label="Outpatient invoices table"
                >
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">
                        First Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Last Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Invoice Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map((inv: Invoice) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-900">
                          {getPatientFirstName(inv.patient_id)}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-blue-600">
                          {getPatientLastName(inv.patient_id)}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-700">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 capitalize">
                          Outpatient
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={inv.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} invoices</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
