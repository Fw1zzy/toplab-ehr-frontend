'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { ListOrdered, RefreshCw } from 'lucide-react';
import { usePatientQueue } from '@/lib/queries/useDashboard';
import { usePatients } from '@/lib/queries/usePatients';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Encounter } from '@/types';

function getPatientName(patientId: string | object, names: Map<string, string>, isLoading: boolean): string {
  if (typeof patientId === 'object' && patientId) {
    const patient = patientId as { first_name?: string; last_name?: string };
    const name = [patient.first_name, patient.last_name].filter(Boolean).join(' ');
    if (name) return name;
    return names.get((patientId as { id?: string }).id ?? '') ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
  }
  return names.get(patientId) ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
}

export default function QueuePage() {
  const { data: queue = [], isLoading, isFetching, error, refetch } = usePatientQueue();
  const patientsQuery = usePatients({ limit: 100 });
  const patientNames = new Map((patientsQuery.data?.data ?? []).map((patient) => [
    patient.id,
    `${patient.first_name} ${patient.last_name}`.trim(),
  ]));

  return (
    <div className="space-y-5">
      <PageHeader title="Patient Queue" description="Today’s not-completed encounters, ordered by encounter date. Auto-refreshes every 15 seconds." actions={<button type="button" onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />Refresh</button>} />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error ? <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to load today&apos;s patient queue from the EHR.</p> : isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : queue.length === 0 ? (
          <EmptyState icon={ListOrdered} title="Queue is empty" description="No encounters for today are currently marked not completed." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Queue Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Encounter Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((enc: Encounter, index: number) => {
                const name = getPatientName(enc.patient_id, patientNames, patientsQuery.isLoading);
                return (
                  <tr key={enc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-center"><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-semibold text-blue-700">{index + 1}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={name} size="sm" />
                        <span className="text-xs font-medium text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDateTime(enc.encounter_date)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{enc.service ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={enc.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
