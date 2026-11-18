'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, ClipboardList, Info, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { AddCompanyForm } from '@/components/corporate/AddCompanyForm';
import { useUpdateCompany } from '@/lib/queries/useCompanies';
import { Company } from '@/types/corporate';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'corporate-requests', label: 'Corporate Requests', icon: ClipboardList },
];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { mutateAsync: updateCompany } = useUpdateCompany();

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', id], queryFn: () => api.companies.getOne(id), enabled: !!id,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ['corporate-requests', id], queryFn: () => api.corporateRequests.getByCompany(id), enabled: !!id,
  });

  if (isLoading) return <p className="p-8 text-center text-sm text-slate-500">Loading company...</p>;

  if (!company) {
    return (
      <EmptyState
        title="Company not found"
        description="This company record does not exist or you don't have permission to view it."
        action={
          <button
            type="button"
            onClick={() => router.push('/companies')}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to companies
          </button>
        }
      />
    );
  }

  const companyId = company.id;
  async function saveCompany(data: Omit<Company, 'id'>) {
    await updateCompany({ id: companyId, data });
  }

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/companies')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Companies
        </button>
        <button type="button" onClick={() => setIsEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <Pencil className="h-3.5 w-3.5" />Edit Company
        </button>
      </div>

      {/* Company Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              </div>
              <StatusBadge status={company.contract_status.toLowerCase()} className="mt-1" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {company.billing_address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {company.billing_address}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex" aria-label="Company profile tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
                role="tab"
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap px-4 py-3.5 text-xs font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5" role="tabpanel">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Company Information</h3>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Company Name</p>
                    <p className="font-medium text-slate-700 mt-0.5">{company.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Billing Address</p>
                    <p className="font-medium text-slate-700 mt-0.5">{company.billing_address}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Contract Status</p>
                    <p className="font-medium text-slate-700 mt-0.5">{company.contract_status}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Corporate Requests Tab */}
          {activeTab === 'corporate-requests' && (
            requests.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No requests" description="No corporate requests found for this company." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 px-1 text-left text-xs font-medium text-slate-400">Request Code</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Type</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Date Submitted</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {requests.map((req) => (
                      <tr 
                        key={req.id} 
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => router.push(`/corporate-requests/${req.id}`)}
                      >
                        <td className="py-3 px-1 text-xs font-mono text-slate-700">{req.company_code ?? '—'}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{req.request_type}</td>
                        <td className="py-3 px-3 text-xs text-slate-600 tabular-nums">{req.corporate_request_date_submitted ? formatDate(req.corporate_request_date_submitted) : '—'}</td>
                        <td className="py-3 px-3"><StatusBadge status={req.status.toLowerCase()} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      <AddCompanyForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onAddCompany={saveCompany}
        company={company}
      />
    </div>
  );
}
