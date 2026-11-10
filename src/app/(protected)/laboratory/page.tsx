'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, FlaskConical, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useLabResults } from '@/lib/queries/useLabResults';
import { usePatients } from '@/lib/queries/usePatients';
import { LabResult } from '@/types';
import { formatDate } from '@/lib/utils';

interface ResultGroup {
  collection: string;
  label: string;
}

function progressText(status: string | null) {
  if (!status) return 'Not Set';
  if (status === 'with_results' || status === 'completed' || status === 'released') return 'With Results';
  if (status === 'for_encoding' || status === 'processing' || status === 'pending') return 'In Progress';
  return status ? status.replace(/_/g, ' ') : 'Not Set';
}

export default function LaboratoryPage() {
  const [progressFilter, setProgressFilter] = useState<'all' | 'in_progress' | 'with_results'>('all');
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useLabResults({ page: 1, limit: 10000 });
  const patientsQuery = usePatients({ limit: 100 });
  const schemaQuery = useQuery({
    queryKey: ['lab-results-schema'],
    queryFn: async () => {
      const response = await fetch('/api/lab-results/schema');
      if (!response.ok) throw new Error('Unable to load lab result types.');
      return response.json() as Promise<ResultGroup[]>;
    },
    staleTime: 60 * 60 * 1000,
  });

  const patientNames = useMemo(() => new Map((patientsQuery.data?.data ?? []).map((patient) => [
    patient.id,
    `${patient.first_name} ${patient.last_name}`.trim(),
  ])), [patientsQuery.data]);
  const collectionNames = useMemo(() => new Map((schemaQuery.data ?? []).map((item) => [item.collection, item.label])), [schemaQuery.data]);
  const allResults = data?.data ?? [];
  const inProgressCount = allResults.filter((item) => progressText(item.status) === 'In Progress').length;
  const withResultsCount = allResults.filter((item) => progressText(item.status) === 'With Results').length;

  const filtered = allResults.filter((item) => {
    const progress = progressText(item.status);
    const matchesStatus = progressFilter === 'all'
      || (progressFilter === 'in_progress' && progress === 'In Progress')
      || (progressFilter === 'with_results' && progress === 'With Results');
    const patientId = typeof item.patient_id === 'string' ? item.patient_id : item.patient_id.id;
    const patientName = patientNames.get(patientId) ?? (patientsQuery.isLoading ? 'Loading patient...' : 'Unknown patient');
    const haystack = `${patientName} ${item.test_name} ${item.result_collection ?? ''} ${item.remarks ?? ''}`.toLowerCase();
    return matchesStatus && (!search || haystack.includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Laboratory" description="Overview of results and encoding progress across all EHR laboratory collections." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="All Results" value={allResults.length} icon={FlaskConical} iconColor="text-blue-600" subtitle="Across laboratory collections" />
        <StatCard title="In Progress" value={inProgressCount} icon={Activity} iconColor="text-amber-600" subtitle="Awaiting result entry" />
        <StatCard title="With Results" value={withResultsCount} icon={CheckCircle2} iconColor="text-emerald-600" subtitle="Results recorded" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'All Results'],
              ['in_progress', 'In Progress'],
              ['with_results', 'With Results'],
            ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setProgressFilter(value)} className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${progressFilter === value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, test, or collection" aria-label="Search all laboratory results" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
          </div>
        </div>

        {error ? <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to load laboratory results from the EHR.</p> : isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-11 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8"><EmptyState icon={FlaskConical} title="No matching lab results" description="Try another progress filter or search term." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm" aria-label="All laboratory results">
              <thead><tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Result Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Requested / Collected</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Progress</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Remarks</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item: LabResult) => {
                  const patientId = typeof item.patient_id === 'string' ? item.patient_id : item.patient_id.id;
                  const patientName = typeof item.patient_id !== 'string'
                    ? `${item.patient_id.first_name ?? ''} ${item.patient_id.last_name ?? ''}`.trim() || patientNames.get(patientId)
                    : patientNames.get(patientId);
                  return <tr key={`${item.result_collection}-${item.id}`}>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-800">{patientName || (patientsQuery.isLoading ? 'Loading patient...' : 'Unknown patient')}</td>
                    <td className="px-4 py-3.5"><p className="text-xs font-medium text-slate-800">{collectionNames.get(item.result_collection ?? '') ?? item.test_name}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.test_name}</p></td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{formatDate(item.collected_date ?? item.released_date)}</td>
                    <td className="px-4 py-3.5"><ProgressPill status={item.status} /></td>
                    <td className="max-w-xs truncate px-4 py-3.5 text-xs text-slate-500" title={item.remarks ?? ''}>{item.remarks ?? '—'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !error && <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">Showing {filtered.length} of {allResults.length} loaded EHR results.</div>}
      </section>
    </div>
  );
}

function ProgressPill({ status }: { status: string | null }) {
  if (!status) return <StatusBadge status="unknown" />;
  if (status === 'with_results' || status === 'completed' || status === 'released') return <StatusBadge status="with_results" />;
  if (status === 'for_encoding' || status === 'processing' || status === 'pending') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-600/20">In Progress</span>;
  return <StatusBadge status={status || 'unknown'} />;
}
