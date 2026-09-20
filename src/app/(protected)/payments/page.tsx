'use client';

import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { usePayments } from '@/lib/queries/usePayments';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDate, formatCurrency, getPatientFullName } from '@/lib/utils';
import { Payment } from '@/types';
import { cn } from '@/lib/utils';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  check: 'Check',
};

const STATUS_TABS = ['all', 'completed', 'pending', 'refunded'];
const PAGE_SIZE = 10;

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = usePayments({
    status: statusTab === 'all' ? undefined : statusTab,
    page,
    limit: PAGE_SIZE,
  });

  const payments = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? payments.filter((pay: Payment) => {
        const name = getPatientName(pay.patient_id).toLowerCase();
        return (
          name.includes(search.toLowerCase()) ||
          pay.payment_number.toLowerCase().includes(search.toLowerCase()) ||
          pay.invoice_number.toLowerCase().includes(search.toLowerCase())
        );
      })
    : payments;

  // Summary stats (calculate from all loaded payments)
  const totalCollected = payments
    .filter((p: Payment) => p.status === 'completed')
    .reduce((s: number, p: Payment) => s + p.amount, 0);
  const totalPending = payments
    .filter((p: Payment) => p.status === 'pending')
    .reduce((s: number, p: Payment) => s + p.amount, 0);
  const refundedCount = payments.filter(
    (p: Payment) => p.status === 'refunded',
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Track and manage payment transactions"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Payments',
            value: total.toString(),
            color: 'text-slate-900',
          },
          {
            label: 'Collected',
            value: formatCurrency(totalCollected),
            color: 'text-emerald-600',
          },
          {
            label: 'Pending',
            value: formatCurrency(totalPending),
            color: 'text-amber-600',
          },
          {
            label: 'Refunded',
            value: refundedCount.toString(),
            color: 'text-purple-600',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3.5"
          >
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${card.color}`}>
              {card.value}
            </p>
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
                onClick={() => {
                  setStatusTab(tab);
                  setPage(1);
                }}
                id={`payment-tab-${tab}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors',
                  statusTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab === 'all' ? 'All Payments' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by patient, payment #, or invoice #..."
            className="w-80"
            id="payments-search"
          />
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Unable to load payments.
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No payments found"
            description="No payments match your current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label="Payments table"
              >
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">
                      Payment #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((pay: Payment) => {
                    const name = getPatientName(pay.patient_id);
                    return (
                      <tr
                        key={pay.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-xs font-mono text-blue-600 font-medium">
                          {pay.payment_number}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={name} size="xs" />
                            <span className="text-xs font-medium text-slate-900">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-600">
                          {pay.invoice_number}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-900 text-right tabular-nums">
                          {formatCurrency(pay.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {PAYMENT_METHOD_LABELS[pay.payment_method] ??
                              pay.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                          {formatDate(pay.payment_date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={pay.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} payments</p>
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
