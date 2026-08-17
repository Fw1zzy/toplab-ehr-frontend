'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useEncounters } from '@/lib/queries/useEncounters';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDateTime, getPatientFullName } from '@/lib/utils';
import { Encounter } from '@/types';
import { ClipboardList } from 'lucide-react';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : patientId as string;
}

const PAGE_SIZE = 10;

export default function EncountersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useEncounters({ status: status || undefined, page, limit: PAGE_SIZE });
  const encounters = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? encounters.filter((e: Encounter) => {
        const name = getPatientName(e.patient_id).toLowerCase();
        return name.includes(search.toLowerCase()) || e.provider_name?.toLowerCase().includes(search.toLowerCase());
      })
    : encounters;

  return (
    <div className="space-y-5">
      <PageHeader title="Encounters" description={`${total.toLocaleString()} total encounters`} />

      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by patient or provider..." className="w-72" id="encounter-search" />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="waiting">Waiting</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Chief Complaint</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((enc: Encounter) => {
                    const name = getPatientName(enc.patient_id);
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
                        <td className="px-4 py-3.5 text-xs text-slate-600">{enc.provider_name ?? '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{enc.service ?? '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">{enc.chief_complaint ?? '—'}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={enc.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Previous</button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
