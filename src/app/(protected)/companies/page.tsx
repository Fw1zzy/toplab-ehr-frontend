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

export default function CompaniesPage() {
  const router = useRouter();
  const { data, isLoading } = useCompanies();
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
        description="Manage your corporate partners and their contracts."
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
      
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {companies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="Get started by creating a new company profile."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Company Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Billing Address</th>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {companies.map((company) => (
                  <tr 
                    key={company.id} 
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/companies/${company.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link href={`/companies/${company.id}`} className="hover:text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={company.contract_status} />
                    </td>
                    <td className="px-6 py-4 truncate max-w-[200px]" title={company.billing_address}>
                      {company.billing_address}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {company.id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/companies/${company.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
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
