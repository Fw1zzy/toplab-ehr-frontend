'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Phone, Mail, MapPin, User, AlertCircle, Heart, FlaskConical, ClipboardList, CreditCard, Brain, CalendarDays, FileText } from 'lucide-react';
import { usePatient } from '@/lib/queries/usePatients';
import { usePatientLabResults } from '@/lib/queries/useLabResults';
import { usePatientInvoices } from '@/lib/queries/useBillingInventory';
import { useEncounters } from '@/lib/queries/useEncounters';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDate, formatCurrency, getPatientAge, getPatientFullName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Encounter, LabResult, Invoice } from '@/types';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'encounters', label: 'Encounters', icon: ClipboardList },
  { id: 'laboratory', label: 'Laboratory', icon: FlaskConical },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'ai-insights', label: 'AI Insights', icon: Brain },
];

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const patientQuery = usePatient(id);
  const labsQuery = usePatientLabResults(id);
  const invoicesQuery = usePatientInvoices(id);
  const encountersQuery = useEncounters({ patientId: id });

  const patient = patientQuery.data;
  const labs = labsQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const encounters = encountersQuery.data?.data ?? [];

  if (patientQuery.isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton rows={3} />
      </div>
    );
  }

  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        description="This patient record does not exist or you don't have permission to view it."
        action={
          <button
            type="button"
            onClick={() => router.push('/patients')}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to patients
          </button>
        }
      />
    );
  }

  const fullName = getPatientFullName(patient);
  const age = getPatientAge(patient.date_of_birth);

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push('/patients')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        id="back-to-patients"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Patients
      </button>

      {/* Patient Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={fullName} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{patient.patient_id}</p>
              </div>
              <StatusBadge status={patient.status} className="mt-1" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>{age} years old</span>
              <span className="capitalize">{patient.sex}</span>
              {patient.blood_type && <span className="font-semibold text-red-600">{patient.blood_type}</span>}
              {patient.branch && <span>{patient.branch}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {patient.contact_number && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {patient.contact_number}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {patient.email}
                </span>
              )}
              {patient.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {patient.city}, {patient.province}
                </span>
              )}
            </div>
            {patient.allergies && (
              <div className="mt-3 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-600">Allergies: {patient.allergies}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex" aria-label="Patient profile tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                role="tab"
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap px-4 py-3.5 text-xs font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5" role="tabpanel">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Demographics */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Demographics</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ['Date of Birth', formatDate(patient.date_of_birth)],
                    ['Sex', patient.sex],
                    ['Civil Status', patient.civil_status ?? '—'],
                    ['Nationality', patient.nationality ?? '—'],
                    ['Religion', patient.religion ?? '—'],
                    ['Blood Type', patient.blood_type ?? '—'],
                    ['PhilHealth', patient.philhealth_number ?? '—'],
                    ['SSS', patient.sss_number ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-slate-400">{label}</p>
                      <p className="font-medium text-slate-700 capitalize mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Contact Information</h3>
                <div className="text-xs space-y-2">
                  <div>
                    <p className="text-slate-400">Address</p>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {[patient.address, patient.city, patient.province, patient.zip_code]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Emergency Contact</p>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {patient.emergency_contact_name
                        ? `${patient.emergency_contact_name} (${patient.emergency_contact_relationship}) — ${patient.emergency_contact_number}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Medical History</h3>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                  {patient.medical_history ?? (
                    <span className="text-slate-400">No medical history recorded.</span>
                  )}
                </div>
              </div>

              {/* Family History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Family History</h3>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                  {patient.family_history ?? (
                    <span className="text-slate-400">No family history recorded.</span>
                  )}
                </div>
              </div>

              {/* Social History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Social History</h3>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                  {patient.social_history ?? (
                    <span className="text-slate-400">No social history recorded.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Encounters Tab */}
          {activeTab === 'encounters' && (
            encountersQuery.isLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : encounters.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No encounters" description="No encounter records found for this patient." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 px-1 text-left text-xs font-medium text-slate-400">Date</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Provider</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Service</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Diagnosis</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {encounters.map((enc: Encounter) => (
                      <tr key={enc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-1 text-xs text-slate-600 tabular-nums">{formatDate(enc.encounter_date)}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{enc.provider_name ?? '—'}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{enc.service ?? '—'}</td>
                        <td className="py-3 px-3 text-xs text-slate-600 max-w-xs truncate">{enc.diagnosis ?? '—'}</td>
                        <td className="py-3 px-3"><StatusBadge status={enc.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Laboratory Tab */}
          {activeTab === 'laboratory' && (
            labsQuery.isLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : labs.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No lab results" description="No laboratory results found for this patient." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 px-1 text-left text-xs font-medium text-slate-400">Test</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Date</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Category</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Status</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">AI Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {labs.map((lab: LabResult) => (
                      <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-1 text-xs font-medium text-slate-700">{lab.test_name}</td>
                        <td className="py-3 px-3 text-xs text-slate-500">{formatDate(lab.requested_date)}</td>
                        <td className="py-3 px-3 text-xs text-slate-500 capitalize">{lab.category.replace('_', ' ')}</td>
                        <td className="py-3 px-3"><StatusBadge status={lab.status} /></td>
                        <td className="py-3 px-3 max-w-xs">
                          {lab.ai_interpretation ? (
                            <p className="text-xs text-slate-600 truncate" title={lab.ai_interpretation}>
                              {lab.ai_interpretation}
                            </p>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            invoicesQuery.isLoading ? (
              <TableSkeleton rows={3} cols={5} />
            ) : invoices.length === 0 ? (
              <EmptyState icon={CreditCard} title="No billing records" description="No invoices found for this patient." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 px-1 text-left text-xs font-medium text-slate-400">Invoice #</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Date</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Type</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-slate-400">Amount</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-slate-400">Balance</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv: Invoice) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-1 text-xs font-mono text-slate-700">{inv.invoice_number}</td>
                        <td className="py-3 px-3 text-xs text-slate-500">{formatDate(inv.invoice_date)}</td>
                        <td className="py-3 px-3 text-xs text-slate-500 capitalize">{inv.type}</td>
                        <td className="py-3 px-3 text-xs text-right font-medium">{formatCurrency(inv.total)}</td>
                        <td className="py-3 px-3 text-xs text-right">{inv.balance > 0 ? <span className="text-red-600 font-medium">{formatCurrency(inv.balance)}</span> : <span className="text-emerald-600">Settled</span>}</td>
                        <td className="py-3 px-3"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* AI Insights Tab */}
          {activeTab === 'ai-insights' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">AI-GENERATED CONTENT</span>
                </div>
                <p className="text-xs text-blue-600">
                  The following information is generated by AI to assist qualified healthcare professionals and does not replace clinical judgment.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Patient Risk Summary</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  {patient.medical_history ? (
                    <p>Based on documented medical history: <strong>{patient.medical_history}</strong></p>
                  ) : (
                    <p className="text-slate-400">Insufficient medical history for AI risk assessment.</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Lab Interpretation</h3>
                {labs.filter((l) => l.ai_interpretation).length === 0 ? (
                  <p className="text-xs text-slate-400">No AI-interpreted laboratory results available.</p>
                ) : (
                  <div className="space-y-3">
                    {labs.filter((l) => l.ai_interpretation).map((lab) => (
                      <div key={lab.id} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                        <p className="text-xs font-medium text-slate-700 mb-1">{lab.test_name}</p>
                        <p className="text-xs text-slate-600">{lab.ai_interpretation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Placeholder tabs */}
          {(activeTab === 'appointments' || activeTab === 'medical-history') && (
            <EmptyState
              title="Coming soon"
              description="This section is under development."
            />
          )}
        </div>
      </div>
    </div>
  );
}
