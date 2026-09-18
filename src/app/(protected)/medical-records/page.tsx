'use client';

import { useState } from 'react';
import { FileText, X, Activity, Pill, TestTube, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useMedicalRecords } from '@/lib/queries/useMedicalRecords';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDate, getPatientFullName } from '@/lib/utils';
import { MedicalRecord } from '@/types';
import { cn } from '@/lib/utils';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  laboratory: 'Laboratory',
  follow_up: 'Follow-up',
  emergency: 'Emergency',
  procedure: 'Procedure',
};

const TYPE_TABS = [
  { id: 'all', label: 'All Records' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'procedure', label: 'Procedure' },
];

const PAGE_SIZE = 10;

export default function MedicalRecordsPage() {
  const [search, setSearch] = useState('');
  const [typeTab, setTypeTab] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  const { data, isLoading, error } = useMedicalRecords({
    recordType: typeTab === 'all' ? undefined : typeTab,
    page,
    limit: PAGE_SIZE,
  });

  const records = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? records.filter((rec: MedicalRecord) => {
        const name = getPatientName(rec.patient_id).toLowerCase();
        return (
          name.includes(search.toLowerCase()) ||
          (rec.diagnosis ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (rec.chief_complaint ?? '').toLowerCase().includes(search.toLowerCase())
        );
      })
    : records;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medical Records"
        description="View patient clinical records, diagnoses, and encounter histories"
      />

      {/* Type tabs + table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTypeTab(tab.id);
                  setPage(1);
                }}
                id={`records-tab-${tab.id}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                  typeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by patient, diagnosis, or complaint..."
            className="w-80"
            id="records-search"
          />
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Unable to load medical records.
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No records found"
            description="No medical records match your current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label="Medical records table"
              >
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Diagnosis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((rec: MedicalRecord) => {
                    const name = getPatientName(rec.patient_id);
                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => setSelectedRecord(rec)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setSelectedRecord(rec);
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} size="sm" />
                            <span className="text-xs font-medium text-slate-900">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                          {formatDate(rec.record_date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {RECORD_TYPE_LABELS[rec.record_type] ??
                              rec.record_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          {rec.diagnosis ? (
                            <p
                              className="text-xs text-slate-700 truncate"
                              title={rec.diagnosis}
                            >
                              {rec.diagnosis}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {rec.provider_name ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={rec.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} records</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Panel (Modal/Slide-over) */}
      {selectedRecord && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedRecord(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-xl overflow-y-auto">
            {/* Detail Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
                  Medical Record
                </p>
                <h2 className="text-sm font-semibold text-slate-900 mt-0.5">
                  {getPatientName(selectedRecord.patient_id)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(selectedRecord.record_date)} ·{' '}
                  {RECORD_TYPE_LABELS[selectedRecord.record_type] ??
                    selectedRecord.record_type.replace('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Close"
                id="close-record-detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Provider */}
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedRecord.status} />
                {selectedRecord.provider_name && (
                  <span className="text-xs text-slate-500">
                    by {selectedRecord.provider_name}
                  </span>
                )}
              </div>

              {/* Chief Complaint */}
              {selectedRecord.chief_complaint && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Chief Complaint
                  </h3>
                  <p className="text-sm text-slate-900">
                    {selectedRecord.chief_complaint}
                  </p>
                </div>
              )}

              {/* Diagnosis */}
              {selectedRecord.diagnosis && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Diagnosis
                  </h3>
                  <p className="text-sm text-slate-900">
                    {selectedRecord.diagnosis}
                  </p>
                </div>
              )}

              {/* Clinical Notes */}
              {selectedRecord.clinical_notes && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Clinical Notes
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedRecord.clinical_notes}
                  </p>
                </div>
              )}

              {/* Vital Signs */}
              {selectedRecord.vital_signs && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: 'Blood Pressure',
                        value: selectedRecord.vital_signs.blood_pressure,
                        unit: 'mmHg',
                      },
                      {
                        label: 'Heart Rate',
                        value: selectedRecord.vital_signs.heart_rate,
                        unit: 'bpm',
                      },
                      {
                        label: 'Temperature',
                        value: selectedRecord.vital_signs.temperature,
                        unit: '°C',
                      },
                      {
                        label: 'Resp. Rate',
                        value: selectedRecord.vital_signs.respiratory_rate,
                        unit: '/min',
                      },
                      {
                        label: 'O₂ Saturation',
                        value: selectedRecord.vital_signs.oxygen_saturation,
                        unit: '%',
                      },
                      {
                        label: 'Weight',
                        value: selectedRecord.vital_signs.weight,
                        unit: 'kg',
                      },
                      {
                        label: 'Height',
                        value: selectedRecord.vital_signs.height,
                        unit: 'cm',
                      },
                    ]
                      .filter((v) => v.value != null)
                      .map((vital) => (
                        <div
                          key={vital.label}
                          className="bg-slate-50 rounded-lg px-3 py-2"
                        >
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            {vital.label}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 tabular-nums">
                            {vital.value}{' '}
                            <span className="text-xs font-normal text-slate-400">
                              {vital.unit}
                            </span>
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {selectedRecord.medications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5" />
                    Medications ({selectedRecord.medications.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedRecord.medications.map((med, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 rounded-lg px-3 py-2.5"
                      >
                        <p className="text-xs font-semibold text-slate-900">
                          {med.name}{' '}
                          <span className="font-normal text-slate-500">
                            {med.dosage}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {med.frequency} · {med.route}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Lab Results */}
              {selectedRecord.lab_result_ids.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TestTube className="h-3.5 w-3.5" />
                    Linked Lab Results
                  </h3>
                  <div className="space-y-1.5">
                    {selectedRecord.lab_result_ids.map((id) => (
                      <div
                        key={id}
                        className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2"
                      >
                        <TestTube className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-mono text-blue-600">
                          {id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
