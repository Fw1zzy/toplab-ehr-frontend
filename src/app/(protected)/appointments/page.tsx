'use client';

import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePatients } from '@/lib/queries/usePatients';
import { useEncounters } from '@/lib/queries/useEncounters';
import { Encounter } from '@/types';
import { formatDate } from '@/lib/utils';

function patientLabel(patient: Encounter['patient_id'], names: Map<string, string>, isLoading: boolean) {
  if (typeof patient === 'object' && patient) {
    const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
    if (name) return name;
    return names.get(patient.id) ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
  }
  return names.get(patient) ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
}

export default function AppointmentsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const { data, isLoading, error } = useEncounters({ page: 1, limit: 100 });
  const patientsQuery = usePatients({ limit: 100 });
  const encounters = data?.data ?? [];
  const patientNames = new Map((patientsQuery.data?.data ?? []).map((patient) => [
    patient.id,
    `${patient.first_name} ${patient.last_name}`.trim(),
  ]));

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }), [month]);

  const visitsByDay = useMemo(() => {
    const grouped = new Map<string, Encounter[]>();
    for (const encounter of encounters) {
      const date = new Date(encounter.encounter_date);
      if (!Number.isNaN(date.getTime())) {
        const key = format(date, 'yyyy-MM-dd');
        grouped.set(key, [...(grouped.get(key) ?? []), encounter]);
      }
    }
    return grouped;
  }, [encounters]);

  const selectedVisits = visitsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];
  const weekdays = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });

  function moveMonth(nextMonth: Date) {
    setMonth(startOfMonth(nextMonth));
    setSelectedDay(startOfDay(nextMonth));
  }

  function selectDay(day: Date) {
    setSelectedDay(startOfDay(day));
    if (!isSameMonth(day, month)) setMonth(startOfMonth(day));
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Appointments" description="Select a date to view visits from the EHR encounter records." />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Appointment calendar">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">Monthly calendar</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{format(month, 'MMMM yyyy')}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => moveMonth(new Date())} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700">Today</button>
              <button type="button" onClick={() => moveMonth(subMonths(month, 1))} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => moveMonth(addMonths(month, 1))} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="p-8 text-center text-sm text-red-600">Unable to load visits from the EHR.</p>
          ) : isLoading ? (
            <div className="grid grid-cols-7 gap-px bg-slate-100 p-px" aria-label="Loading calendar">
              {Array.from({ length: 35 }, (_, index) => <div key={index} className="min-h-20 animate-pulse bg-white sm:min-h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-slate-100 p-px">
              {weekdays.map((day) => <div key={day.toISOString()} className="bg-slate-50 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{format(day, 'EEE')}</div>)}
              {days.map((day) => {
                const visits = visitsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
                const active = isSameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDay(day)}
                    aria-pressed={active}
                    aria-label={`${format(day, 'MMMM d, yyyy')}, ${visits.length} visits`}
                    className={`group flex min-h-20 flex-col items-start bg-white p-1.5 text-left transition-colors hover:bg-blue-50/70 sm:min-h-24 sm:p-2.5 ${!isSameMonth(day, month) ? 'text-slate-300' : 'text-slate-700'} ${active ? 'relative z-10 bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isToday(day) ? 'bg-blue-600 text-white' : active ? 'text-blue-700' : isSameMonth(day, month) ? 'text-slate-700' : 'text-slate-300'}`}>
                      {format(day, 'd')}
                    </span>
                    {visits.length > 0 && (
                      <span className="mt-1 flex w-full items-center gap-1 overflow-hidden">
                        <span className={`h-1.5 w-1.5 flex-none rounded-full ${active ? 'bg-blue-600' : 'bg-cyan-500'}`} />
                        <span className={`truncate text-[9px] font-medium sm:text-[10px] ${active ? 'text-blue-700' : 'text-slate-500'}`}>
                          {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Visit dates are based on the encounter date stored in the EHR.
          </div>
        </section>

        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Selected day's appointments">
          <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">Selected day</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{format(selectedDay, 'EEEE, MMM d')}</h2>
            <p className="mt-1 text-xs text-slate-500">{selectedVisits.length} {selectedVisits.length === 1 ? 'visit' : 'visits'}</p>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-4"><div className="h-16 animate-pulse rounded-xl bg-slate-100" /><div className="h-16 animate-pulse rounded-xl bg-slate-100" /></div>
          ) : selectedVisits.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><CalendarDays className="h-5 w-5" /></div>
              <p className="mt-3 text-sm font-medium text-slate-700">No visits on this day</p>
              <p className="mt-1 text-xs text-slate-400">Choose another date to see its encounters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedVisits.map((encounter) => (
                <li key={encounter.id} className="space-y-2.5 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{patientLabel(encounter.patient_id, patientNames, patientsQuery.isLoading)}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{encounter.encounter_type ?? 'Encounter'}{encounter.service ? ` · ${encounter.service}` : ''}</p>
                    </div>
                    <StatusBadge status={encounter.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(encounter.encounter_date, 'h:mm a')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
