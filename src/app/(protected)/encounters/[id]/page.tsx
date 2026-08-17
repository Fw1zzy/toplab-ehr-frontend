'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Brain } from 'lucide-react';
import { useEncounter } from '@/lib/queries/useEncounters';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { getPatientFullName, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function EncounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: encounter, isLoading } = useEncounter(id);

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (!encounter) return (
    <EmptyState icon={ClipboardList} title="Encounter not found" action={
      <button type="button" onClick={() => router.push('/encounters')} className="text-xs text-blue-600 hover:underline">Back</button>
    } />
  );

  const patient = MOCK_PATIENTS.find((p) => p.id === encounter.patient_id);
  const patientName = patient ? getPatientFullName(patient) : String(encounter.patient_id);

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => router.push('/encounters')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors" id="back-to-encounters">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Encounters
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-mono">{encounter.id}</p>
            <h1 className="text-lg font-bold text-slate-900 mt-1">{patientName}</h1>
            <p className="text-sm text-slate-500">{formatDateTime(encounter.encounter_date)}</p>
          </div>
          <StatusBadge status={encounter.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            ['Provider', encounter.provider_name ?? '—'],
            ['Service', encounter.service ?? '—'],
            ['Branch', encounter.branch ?? '—'],
            ['Queue #', encounter.queue_number?.toString() ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400">{label}</p>
              <p className="font-medium text-slate-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Chief Complaint</h2>
          <p className="text-xs text-slate-600">{encounter.chief_complaint ?? 'None documented.'}</p>
          <h2 className="text-sm font-semibold text-slate-900 pt-3 border-t border-slate-100">Clinical Notes</h2>
          <p className="text-xs text-slate-600">{encounter.clinical_notes ?? 'No clinical notes recorded.'}</p>
          <h2 className="text-sm font-semibold text-slate-900 pt-3 border-t border-slate-100">Diagnosis</h2>
          <p className="text-xs text-slate-600">{encounter.diagnosis ?? 'No diagnosis recorded.'}</p>
        </div>

        {encounter.ai_summary && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">AI Clinical Summary</h2>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AI-GENERATED</p>
              <p className="text-xs text-slate-700 leading-relaxed">{encounter.ai_summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
