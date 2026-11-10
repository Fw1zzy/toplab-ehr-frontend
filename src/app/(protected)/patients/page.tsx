'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { UserPlus, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { formatDate, getPatientAge, getPatientFullName } from '@/lib/utils';
import { Patient } from '@/types';
import { Users } from 'lucide-react';
import { AddPatientForm } from '@/components/patients/AddPatientForm';
import { usePreferences } from '@/lib/auth/PreferencesProvider';
import { api } from '@/lib/api';
import { RequestPatientTransferDialog } from '@/components/patients/RequestPatientTransferDialog';

export default function PatientsPage() {
  const { preferences } = usePreferences();
  const PAGE_SIZE = preferences.rowsPerPage;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [otherBranchSearch, setOtherBranchSearch] = useState('');
  const [debouncedOtherBranchSearch, setDebouncedOtherBranchSearch] = useState('');
  const [patientSection, setPatientSection] = useState<'branch' | 'other'>('branch');
  const [page, setPage] = useState(1);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedOtherPatient, setSelectedOtherPatient] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error } = usePatients({
    search,
    page,
    limit: PAGE_SIZE,
  });
  const companiesQuery = useCompanies();
  const companyNames = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));
  const otherBranchQuery = useQuery({
    queryKey: ['patients', 'other-branches', debouncedOtherBranchSearch],
    queryFn: () => api.patients.searchOtherBranchesByName(debouncedOtherBranchSearch),
    enabled: patientSection === 'other' && debouncedOtherBranchSearch.trim().length >= 2,
    staleTime: 15_000,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOtherBranchSearch(otherBranchSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [otherBranchSearch]);

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
              onClick={() => setIsAddFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              id="add-patient-btn"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Patient
            </button>
          </>
        }
      />

      <div className="flex w-fit max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {([
          ['branch', 'My Branch Patients'],
          ['other', 'Other Branch Transfer'],
        ] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setPatientSection(key)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-colors ${patientSection === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
      </div>

      {patientSection === 'branch' ? <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, ID, contact..."
          className="w-72"
          id="patient-search"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Unable to load patients. Please try again.
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={8} cols={6} />
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Company</th>
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
                              <p className="text-[10px] text-slate-400">{age == null ? 'Age not recorded' : `${age} years old`}</p>
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
                          {patient.company_id ? companyNames.get(patient.company_id) ?? 'Unknown company' : '—'}
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
      </> : <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="space-y-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Find a patient from another branch</h2>
            <p className="mt-1 text-xs text-slate-500">Search returns patient names only. The full linked patient record moves to your branch after the patient authorizes the transfer.</p>
          </div>
          <SearchInput value={otherBranchSearch} onChange={setOtherBranchSearch} placeholder="Search by patient name..." className="w-full max-w-md" id="other-branch-patient-search" />
        </div>
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Only patient names are shown in search. Verifying the patient&apos;s email code transfers custody of the existing record and its linked history; it does not make a duplicate.
        </div>
        {debouncedOtherBranchSearch.trim().length < 2 ? <div className="p-8 text-center text-xs text-slate-500">Enter at least two letters of the patient&apos;s name.</div> : otherBranchQuery.error ? (
          <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to search other-branch patient names.</p>
        ) : otherBranchQuery.isLoading ? <TableSkeleton rows={4} cols={2} /> : (otherBranchQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Users} title="No patient names found" description="No other-branch patient names match that search." />
        ) : (
          <div className="divide-y divide-slate-100">
            {(otherBranchQuery.data ?? []).map((patient) => <div key={patient.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-sm font-medium text-slate-900">{patient.name}</p>
              <button type="button" onClick={() => setSelectedOtherPatient({ id: patient.id, name: patient.name })} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Request Transfer</button>
            </div>)}
          </div>
        )}
      </section>}

      <AddPatientForm 
        open={isAddFormOpen} 
        onOpenChange={setIsAddFormOpen} 
      />
      <RequestPatientTransferDialog
        patient={selectedOtherPatient}
        open={selectedOtherPatient !== null}
        onOpenChange={(open) => { if (!open) setSelectedOtherPatient(null); }}
        onApproved={() => {
          queryClient.invalidateQueries({ queryKey: ['patients'] });
          queryClient.invalidateQueries({ queryKey: ['encounters'] });
          queryClient.invalidateQueries({ queryKey: ['lab-results'] });
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['patients', 'other-branches'] });
          if (selectedOtherPatient) router.push(`/patients/${selectedOtherPatient.id}`);
          setSelectedOtherPatient(null);
        }}
      />
    </div>
  );
}
