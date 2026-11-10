'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';
import { AddCorporateRequestForm } from '@/components/corporate/AddCorporateRequestForm';
import { useCompanies } from '@/lib/queries/useCompanies';
import { formatCurrency } from '@/lib/utils';

export default function CorporateRequestsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['corporate-requests'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
  });
  const { data: companiesData } = useCompanies();
  const companyNames = new Map((companiesData?.data ?? []).map((company) => [company.id, company.name]));
  const requests = (data?.data ?? []).filter((request) => {
    const companyId = typeof request.company === 'string' ? request.company : request.company.id;
    const companyName = companyNames.get(companyId) ?? '';
    return `${request.company_code ?? ''} ${request.request_type} ${companyName}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Corporate Requests" 
        description="Manage PEME and APE workflows."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Request
          </button>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search request or company code..." className="w-80" id="corporate-request-search" />
        </div>
        {error ? <p className="p-8 text-center text-sm text-red-600">Unable to load corporate requests from the EHR.</p> : isLoading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading corporate requests...</p>
        ) : requests.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No corporate requests found" description="No matching requests were returned by the EHR." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Corporate requests">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Request Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Request Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Submitted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Quoted Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((request) => <tr key={request.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-900">{companyNames.get(typeof request.company === 'string' ? request.company : request.company.id) ?? 'Unknown company'}</td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{request.company_code ?? '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-700">{request.request_type}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{request.corporate_request_date_submitted ? formatDate(request.corporate_request_date_submitted) : '—'}</td>
                  <td className="px-4 py-3.5 text-right text-xs text-slate-700">{request.quoted_price == null ? '—' : formatCurrency(request.quoted_price)}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={request.status} /></td>
                  <td className="px-4 py-3.5 text-right"><Link href={`/corporate-requests/${request.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">View</Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AddCorporateRequestForm open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
