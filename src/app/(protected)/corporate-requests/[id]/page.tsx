'use client';

import { PageHeader } from '@/components/ui/PageHeader';

import { use } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardCheck, FilePlus2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCompanies } from '@/lib/queries/useCompanies';

export default function CorporateRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const queryClient = useQueryClient();
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['corporate-request', resolvedParams.id],
    queryFn: () => api.corporateRequests.getOne(resolvedParams.id),
  });
  const { data: companiesData } = useCompanies();
  const companies = new Map((companiesData?.data ?? []).map((company) => [company.id, company.name]));
  const generateInvoice = useMutation({
    mutationFn: () => api.invoices.generateForCorporateRequest(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['corporate-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corporate-request', resolvedParams.id] });
    },
  });

  if (isLoading) return <p className="p-8 text-center text-sm text-slate-500">Loading request...</p>;
  if (error || !request) return <EmptyState icon={ClipboardCheck} title="Request not found" description="The EHR did not return this corporate request." />;
  const companyId = typeof request.company === 'string' ? request.company : request.company.id;
  const companyName = companies.get(companyId) ?? (companiesData ? 'Unknown company' : 'Loading company...');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={`Corporate Request ${request.company_code ?? request.request_type}`}
        description={request.request_type}
        actions={
          <button
            type="button"
            onClick={() => generateInvoice.mutate()}
            disabled={generateInvoice.isPending || request.is_invoiced}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
          <FilePlus2 className="h-3.5 w-3.5" />
          {generateInvoice.isPending ? 'Generating...' : request.is_invoiced ? 'Already Invoiced' : 'Generate Draft Invoice'}
          </button>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-medium">Request Details</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Company</dt><dd className="mt-1 text-sm text-slate-900">{companyName}</dd></div>
          <div><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1"><StatusBadge status={request.status} /></dd></div>
          <div><dt className="text-xs text-slate-500">Submitted</dt><dd className="mt-1 text-sm text-slate-900">{request.corporate_request_date_submitted ? formatDate(request.corporate_request_date_submitted) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Schedule</dt><dd className="mt-1 text-sm text-slate-900">{request.schedule_start_date_ ? formatDate(request.schedule_start_date_) : '—'} – {request.schedule_end_date ? formatDate(request.schedule_end_date) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Quoted Price</dt><dd className="mt-1 text-sm text-slate-900">{request.quoted_price == null ? '—' : formatCurrency(request.quoted_price)}</dd></div>
          <div><dt className="text-xs text-slate-500">Invoiced</dt><dd className="mt-1 text-sm text-slate-900">{request.is_invoiced ? 'Yes' : 'No'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900">{request.notes ?? '—'}</dd></div>
        </dl>
        {generateInvoice.error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{generateInvoice.error instanceof Error ? generateInvoice.error.message : 'Unable to generate invoice from the EHR request.'}</p>}
      </div>
    </div>
  );
}
