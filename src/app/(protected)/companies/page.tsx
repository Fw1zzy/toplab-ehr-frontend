'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2, Plus } from 'lucide-react';
import { Company } from '@/types/corporate';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useRouter } from 'next/navigation';
import { AddCompanyForm } from '@/components/corporate/AddCompanyForm';
import { useCompanies, useCreateCompany } from '@/lib/queries/useCompanies';
import { StatCard } from '@/components/ui/StatCard';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function CompaniesPage() {
  const router = useRouter();
  const { data, isLoading, error } = useCompanies();
  const { mutateAsync: createCompany } = useCreateCompany();
  const companies = data?.data ?? [];
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddCompany = async (newCompany: Omit<Company, 'id'>) => {
    await createCompany(newCompany);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Companies" 
        description="Corporate partners and contract details from the EHR."
        actions={
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Company
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Companies" value={companies.length} icon={Building2} iconColor="text-blue-600" subtitle="EHR company records" />
        <StatCard title="Active Contracts" value={companies.filter((company) => company.contract_status === 'Active').length} icon={Building2} iconColor="text-emerald-600" subtitle="Current EHR contract status" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {error ? <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to load company records from the EHR.</p> : isLoading ? <TableSkeleton rows={5} cols={3} /> : companies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="Get started by creating a new company profile."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Company Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Contract Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Billing Address</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {companies.map((company) => (
                  <tr 
                    key={company.id} 
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/companies/${company.id}`)}
                  >
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-900">
                      <Link href={`/companies/${company.id}`} className="hover:text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={company.contract_status.toLowerCase()} />
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3.5 text-xs text-slate-600" title={company.billing_address}>
                      {company.billing_address || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/companies/${company.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCompanyForm 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        onAddCompany={handleAddCompany}
      />
    </div>
  );
}
