'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { api } from '@/lib/api';
import { AddEmployeeForm } from '@/components/corporate/AddEmployeeForm';
import { useCompanies } from '@/lib/queries/useCompanies';

export default function StaffPage() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['ehr-employees'], queryFn: () => api.staff.getAll(),
  });
  const { data: requestsData } = useQuery({
    queryKey: ['corporate-requests', 'staff-labels'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
  });
  const companiesQuery = useCompanies();
  const companies = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));
  const requestLabels = new Map((requestsData?.data ?? []).map((request) => {
    const companyId = typeof request.company === 'string' ? request.company : request.company.id;
    const label = [companies.get(companyId), request.company_code ?? request.request_type].filter(Boolean).join(' · ');
    return [request.id, label];
  }));
  const filtered = employees.filter((employee) =>
    `${employee.first_name} ${employee.middle_name ?? ''} ${employee.last_name} ${employee.email ?? ''} ${requestLabels.get(employee.corporate_request_id) ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Staff" description={`${employees.length} employee records linked to EHR corporate requests. These are employee records, not login accounts.`} actions={<button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Add Employee</button>} />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." className="w-72" id="staff-search" />
        </div>
        {error ? <p className="p-8 text-center text-sm text-red-600">Unable to load employee records. Check CMS collection access.</p> : isLoading ? <TableSkeleton rows={5} cols={3} /> : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No employees found" description="No employee records match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="EHR employees">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Corporate Request</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Mobile</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((employee) => <tr key={employee.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-900">{`${employee.first_name} ${employee.middle_name ?? ''} ${employee.last_name}`.trim()}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{requestLabels.get(employee.corporate_request_id) ?? 'Corporate request'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{employee.email ?? '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{employee.mobile_number ?? '—'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AddEmployeeForm open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
