'use client';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarDays } from 'lucide-react';

export default function AppointmentsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Appointments" description="Schedule and manage patient appointments" />
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-700">Appointment Calendar</p>
        <p className="text-xs text-slate-400 mt-1">Full scheduling calendar coming soon.</p>
      </div>
    </div>
  );
}
