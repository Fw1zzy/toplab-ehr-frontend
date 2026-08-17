'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { ListOrdered } from 'lucide-react';
import { usePatientQueue } from '@/lib/queries/useDashboard';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { getPatientFullName, formatWaitingTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Encounter } from '@/types';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

export default function QueuePage() {
  const { data: queue = [], isLoading } = usePatientQueue();

  return (
    <div className="space-y-5">
      <PageHeader title="Patient Queue" description="Real-time queue management" />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : queue.length === 0 ? (
          <EmptyState icon={ListOrdered} title="Queue is empty" description="No patients currently in queue." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Queue #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Waiting</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((enc: Encounter) => {
                const name = getPatientName(enc.patient_id);
                return (
                  <tr key={enc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                        {enc.queue_number ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={name} size="sm" />
                        <span className="text-xs font-medium text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{enc.service ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatWaitingTime(enc.waiting_since)}</td>
                    <td className="px-4 py-3"><StatusBadge status={enc.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
