'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Building2, MapPin, ClipboardList, Info } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { Company, CorporateRequest } from '@/types/corporate';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'corporate-requests', label: 'Corporate Requests', icon: ClipboardList },
];

const MOCK_COMPANY: Company = {
  id: 'e7b1c34a-9d22-48f5-b96c-123456789abc',
  name: 'TechFlow Solutions',
  contract_status: 'Active',
  billing_address: '123 Innovation Drive, Tech Park, Cityville',
};

const MOCK_REQUESTS: CorporateRequest[] = [
  {
    id: 'req-1',
    company_code: 'TECH-001',
    company: 'TechFlow Solutions',
    request_type: 'PEME (Newly Hired)',
    status: 'approved',
    schedule_start_date_: '2026-10-10',
    schedule_end_date: '2026-10-15',
    quoted_price: 25000,
    corporate_request_date_submitted: '2026-10-01',
    is_invoiced: false,
    finalize_request: true,
    notes: 'Urgent processing required.'
  },
];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const company = MOCK_COMPANY;

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
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Edit Company
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
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{id}</p>
              </div>
              <StatusBadge status={company.contract_status} className="mt-1" />
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
                    <p className="font-medium text-slate-700 mt-0.5 capitalize">{company.contract_status}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Corporate Requests Tab */}
          {activeTab === 'corporate-requests' && (
            MOCK_REQUESTS.length === 0 ? (
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
                    {MOCK_REQUESTS.map((req) => (
                      <tr 
                        key={req.id} 
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => router.push(`/corporate-requests/${req.id}`)}
                      >
                        <td className="py-3 px-1 text-xs font-mono text-slate-700">{req.company_code}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{req.request_type}</td>
                        <td className="py-3 px-3 text-xs text-slate-600 tabular-nums">{req.corporate_request_date_submitted}</td>
                        <td className="py-3 px-3"><StatusBadge status={req.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
