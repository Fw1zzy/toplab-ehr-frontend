'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Download, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { usePatients } from '@/lib/queries/usePatients';
import { formatDate, getPatientAge, getPatientFullName } from '@/lib/utils';
import { Patient } from '@/types';
import { Users } from 'lucide-react';

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = usePatients({
    search,
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
  });

  const patients = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patients"
        description={`${total.toLocaleString()} registered patients`}
        actions={
          <>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              id="export-patients-btn"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              id="add-patient-btn"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Patient
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, ID, contact..."
          className="w-72"
          id="patient-search"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          id="status-filter"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
        </select>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white h-9 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          id="more-filters-btn"
        >
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          More filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Unable to load patients. Please try again.
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients found"
            description={search ? 'Try adjusting your search or filters.' : 'Add a patient to get started.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Patients table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Patient ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Date of Birth</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Sex</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {patients.map((patient: Patient) => {
                    const fullName = getPatientFullName(patient);
                    const age = getPatientAge(patient.date_of_birth);
                    return (
                      <tr
                        key={patient.id}
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => router.push(`/patients/${patient.id}`)}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(`/patients/${patient.id}`);
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={fullName} size="sm" />
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{fullName}</p>
                              <p className="text-[10px] text-slate-400">{age} years old</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                          {patient.patient_id}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 tabular-nums">
                          {formatDate(patient.date_of_birth, 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 capitalize">
                          {patient.sex}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {patient.contact_number ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {patient.branch ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={patient.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} patients
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  id="prev-page-btn"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 px-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  id="next-page-btn"
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
