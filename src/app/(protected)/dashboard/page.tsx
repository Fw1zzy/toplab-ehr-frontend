'use client';

import { Users, CalendarDays, Clock, ClipboardCheck, FlaskConical, DollarSign, RefreshCw } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import {
  useDashboardMetrics,
  useTodayAppointments,
  usePatientQueue,
  useRecentLabResults,
} from '@/lib/queries/useDashboard';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDate, formatWaitingTime, formatCurrency, getPatientFullName } from '@/lib/utils';
import { Encounter, LabResult } from '@/types';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object' && patientId !== null) {
    const p = patientId as { first_name: string; last_name: string };
    return `${p.first_name} ${p.last_name}`;
  }
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

export default function DashboardPage() {
  const metricsQuery = useDashboardMetrics();
  const appointmentsQuery = useTodayAppointments();
  const queueQuery = usePatientQueue();
  const labsQuery = useRecentLabResults();

  const metrics = metricsQuery.data;
  const appointments = appointmentsQuery.data ?? [];
  const queue = queueQuery.data ?? [];
  const labs = labsQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-PH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => metricsQuery.refetch()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          aria-label="Refresh dashboard"
          id="refresh-dashboard"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${metricsQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricsQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : metrics ? (
          <>
            <StatCard
              title="Total Patients"
              value={metrics.totalPatients}
              icon={Users}
              iconColor="text-blue-600"
              subtitle="All registered"
            />
            <StatCard
              title="Today's Appointments"
              value={metrics.todayAppointments}
              icon={CalendarDays}
              iconColor="text-violet-600"
              subtitle="Scheduled today"
            />
            <StatCard
              title="Patients Waiting"
              value={metrics.patientsWaiting}
              icon={Clock}
              iconColor="text-amber-600"
              subtitle="In queue now"
            />
            <StatCard
              title="Completed Encounters"
              value={metrics.completedEncounters}
              icon={ClipboardCheck}
              iconColor="text-emerald-600"
              subtitle="This month"
            />
            <StatCard
              title="Pending Lab Results"
              value={metrics.pendingLabResults}
              icon={FlaskConical}
              iconColor="text-orange-600"
              subtitle="Awaiting processing"
            />
            <StatCard
              title="Today's Revenue"
              value={metrics.todayRevenue}
              icon={DollarSign}
              iconColor="text-teal-600"
              isCurrency
              subtitle="Invoices collected"
            />
          </>
        ) : null}
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Today's Appointments */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Today's Appointments</h2>
              <p className="text-xs text-slate-400 mt-0.5">{appointments.length} appointments scheduled</p>
            </div>
            <a href="/appointments" className="text-xs text-blue-600 hover:underline font-medium">
              View all
            </a>
          </div>

          {appointmentsQuery.isLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : appointments.length === 0 ? (
            <EmptyState
              title="No appointments today"
              description="Appointments will appear here as they are scheduled."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-400">Patient</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Provider</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Service</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {appointments.map((enc: Encounter) => (
                    <tr key={enc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={getPatientName(enc.patient_id)} size="sm" />
                          <span className="text-xs font-medium text-slate-900">
                            {getPatientName(enc.patient_id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                        {formatDate(enc.encounter_date, 'h:mm a')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {enc.provider_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {enc.service ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={enc.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Patient Queue */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Patient Queue</h2>
              <p className="text-xs text-slate-400 mt-0.5">{queue.length} in queue</p>
            </div>
            <a href="/queue" className="text-xs text-blue-600 hover:underline font-medium">
              Manage
            </a>
          </div>

          {queueQuery.isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <EmptyState title="Queue is empty" description="No patients currently waiting." />
          ) : (
            <ul className="divide-y divide-slate-50 px-4 py-2">
              {queue.map((enc: Encounter) => (
                <li key={enc.id} className="py-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                    {enc.queue_number ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {getPatientName(enc.patient_id)}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{enc.service ?? 'General'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={enc.status} />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatWaitingTime(enc.waiting_since)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Lab Results */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Laboratory Results</h2>
          </div>
          <a href="/laboratory" className="text-xs text-blue-600 hover:underline font-medium">
            View all
          </a>
        </div>

        {labsQuery.isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : labs.length === 0 ? (
          <EmptyState
            title="No recent lab results"
            description="Laboratory results will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-400">Patient</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Test</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">AI Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {labs.map((lab: LabResult) => (
                  <tr key={lab.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={getPatientName(lab.patient_id)} size="sm" />
                        <span className="text-xs font-medium text-slate-900">
                          {getPatientName(lab.patient_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{lab.test_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                      {formatDate(lab.requested_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lab.status} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {lab.ai_interpretation ? (
                        <p className="text-xs text-slate-600 truncate" title={lab.ai_interpretation}>
                          {lab.ai_interpretation}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
