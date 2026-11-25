'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useEncounters } from '@/lib/queries/useEncounters';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Encounter } from '@/types';
import { ClipboardList, Plus, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddEncounterForm } from '@/components/encounters/AddEncounterForm';
import { usePreferences } from '@/lib/auth/PreferencesProvider';

function getPatientName(patientId: string | object, patientNames: Map<string, string>, isLoading: boolean): string {
  if (typeof patientId === 'object' && patientId) {
    const patient = patientId as { first_name?: string; last_name?: string };
    const name = [patient.first_name, patient.last_name].filter(Boolean).join(' ');
    if (name) return name;
    return patientNames.get((patientId as { id?: string }).id ?? '') ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
  }
  return patientNames.get(patientId) ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
}

const TABS = [
  { id: 'all', label: 'All Encounters', icon: ClipboardList },
  { id: 'outpatient', label: 'Outpatient (OPD)', icon: User },
  { id: 'corporate', label: 'Corporate (PEME / APE)', icon: Building2 },
];

export default function EncountersPage() {
  const { preferences } = usePreferences();
  const PAGE_SIZE = preferences.rowsPerPage;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const { data, isLoading, error } = useEncounters({ page, limit: PAGE_SIZE, status, search, kind: activeTab });
  const patientsQuery = usePatients({ limit: 100 });
  const companiesQuery = useCompanies();
  const requestsQuery = useQuery({
    queryKey: ['corporate-requests', 'encounter-labels'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
  });
  const encounters = data?.data ?? [];
  const patientNames = new Map((patientsQuery.data?.data ?? []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]));
  const companyNames = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));
  const requestNames = new Map((requestsQuery.data?.data ?? []).map((request) => [request.id, request.company_code || request.request_type]));

  const filtered = encounters;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagedEncounters = encounters;

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader 
        title="Encounters" 
        description={`${data?.total ?? encounters.length} total encounters`}
        actions={
          <button
            type="button"
            onClick={() => setIsAddFormOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Encounter
          </button>
        }
      />

      {/* Tabs */}
      <div className="max-w-full overflow-x-auto bg-white rounded-xl border border-slate-200 p-1.5 inline-flex shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === tab.id 
                ? 'bg-slate-100 text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <tab.icon className={cn('h-4 w-4', activeTab === tab.id ? 'text-blue-600' : '')} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={updateSearch} placeholder="Search patient, type, or service..." className="w-72" id="encounter-search" />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">Unable to load encounters.</div>
        ) : isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No encounters found" description="No encounter records match your filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Encounters table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Date & Time</th>
                    {activeTab === 'all' && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Type</th>}
                    {activeTab === 'corporate' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Corporate Request</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagedEncounters.map((enc: Encounter) => {
                    const name = getPatientName(enc.patient_id, patientNames, patientsQuery.isLoading);
                    const type = enc.encounter_type || 'OPD';
                    
                    return (
                      <tr
                        key={enc.id}
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => router.push(`/encounters/${enc.id}`)}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/encounters/${enc.id}`); }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} size="sm" />
                            <span className="text-xs font-medium text-slate-900">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 tabular-nums">{formatDateTime(enc.encounter_date)}</td>
                        
                        {activeTab === 'all' && (
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                              type === 'OPD' ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            )}>
                              {type}
                            </span>
                          </td>
                        )}
                        
                        {activeTab === 'corporate' && (
                          <>
                            <td className="px-4 py-3.5 text-xs text-slate-600">{enc.company ? companyNames.get(enc.company) ?? 'Unknown company' : '—'}</td>
                            <td className="px-4 py-3.5 text-xs text-slate-600">{enc.corporate_request ? requestNames.get(enc.corporate_request) ?? 'Corporate request' : '—'}</td>
                          </>
                        )}

                        <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[200px] truncate" title={enc.service ?? ''}>{enc.service ?? '—'}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={enc.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-3 rounded-md border border-slate-200 bg-white text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm">Previous</button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-7 px-3 rounded-md border border-slate-200 bg-white text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      <AddEncounterForm 
        open={isAddFormOpen} 
        onOpenChange={setIsAddFormOpen} 
      />
    </div>
  );
}
