'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, MapPin, User, FlaskConical, ClipboardList, CreditCard, Building2, History } from 'lucide-react';
import { usePatient } from '@/lib/queries/usePatients';
import { usePatientLabResults } from '@/lib/queries/useLabResults';
import { usePatientInvoices } from '@/lib/queries/useBillingInventory';
import { useEncounters } from '@/lib/queries/useEncounters';
import { useCompanies } from '@/lib/queries/useCompanies';
import { PatientAvatar } from '@/components/patients/PatientAvatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { AddPatientForm } from '@/components/patients/AddPatientForm';
import { PatientQrIdCard } from '@/components/patients/PatientQrIdCard';
import { formatDate, formatCurrency, getPatientAge, getPatientFullName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Encounter, LabResult, Invoice } from '@/types';
import { api } from '@/lib/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'encounters', label: 'Encounters', icon: ClipboardList },
  { id: 'laboratory', label: 'Laboratory', icon: FlaskConical },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'history', label: 'Interclinic History', icon: History },
];

function formatHistoryDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function historyEventLabel(eventType: string) {
  switch (eventType) {
    case 'request': return 'Access requested';
    case 'approval': return 'Patient authorization verified';
    case 'transfer': return 'Patient custody transferred';
    case 'revocation': return 'Previous access revoked';
    case 'expired': return 'Authorization expired';
    case 'denial': return 'Authorization denied';
    default: return eventType.replace(/_/g, ' ');
  }
}

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const patientQuery = usePatient(id);
  const labsQuery = usePatientLabResults(id);
  const invoicesQuery = usePatientInvoices(id);
  const encountersQuery = useEncounters({ patientId: id });
  const companiesQuery = useCompanies();
  const historyQuery = useQuery({
    queryKey: ['interclinic-history', id],
    queryFn: () => api.interclinic.getHistory(id),
    enabled: activeTab === 'history' && !!id,
    staleTime: 15_000,
  });

  const patient = patientQuery.data;
  const labs = labsQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const encounters = encountersQuery.data?.data ?? [];
  const companyName = patient?.company_id
    ? companiesQuery.data?.data.find((company) => company.id === patient.company_id)?.name ?? (companiesQuery.isLoading ? 'Loading company...' : 'Unknown company')
    : null;

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
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/patients')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          id="back-to-patients"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Patients
        </button>
        <button
          type="button"
          onClick={() => setIsEditFormOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Edit Patient
        </button>
      </div>

      {/* Patient Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <PatientAvatar patientId={patient.id} avatarFileId={patient.avatar_id} name={fullName} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{patient.patient_id}</p>
                {patient.origin_branch_id && patient.custodian_branch_id && patient.origin_branch_id !== patient.custodian_branch_id && <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Transferred to this branch</span>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                <span>{age == null ? 'Age not recorded' : `${age} years old`}</span>
                <span className="capitalize">{patient.sex ?? 'Sex not recorded'}</span>
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
              {patient.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {patient.address}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <PatientQrIdCard patient={{ id: patient.id, name: fullName, patientNumber: patient.patient_id, avatarFileId: patient.avatar_id }} />

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
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Demographics */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Demographics</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ['Date of Birth', formatDate(patient.date_of_birth)],
                    ['Sex', patient.sex],
                    ['Civil Status', patient.civil_status ?? '—'],
                    ['Suffix', patient.suffix ?? '—'],
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
                    <h3 className="text-sm font-semibold text-slate-900">EHR Details</h3>
                <div className="text-xs space-y-2">
                  <div>
                    <p className="text-slate-400">Address</p>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {patient.address ?? '—'}
                    </p>
                  </div>
                  {companyName && <div><p className="flex items-center gap-1.5 text-slate-400"><Building2 className="h-3.5 w-3.5" />Company</p><p className="mt-0.5 font-medium text-slate-700">{companyName}</p></div>}
                </div>
              </div>

              {(patient.valid_id_presented || patient.valid_id_number) && <div className="space-y-3"><h3 className="text-sm font-semibold text-slate-900">Identification</h3><div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs sm:grid-cols-2"><div><p className="text-slate-400">Valid ID Presented</p><p className="mt-0.5 font-medium text-slate-700">{patient.valid_id_presented ?? '—'}</p></div><div><p className="text-slate-400">ID Number</p><p className="mt-0.5 font-medium text-slate-700">{patient.valid_id_number ?? '—'}</p></div></div></div>}
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
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Type</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Service</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {encounters.map((enc: Encounter) => (
                      <tr key={enc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-1 text-xs text-slate-600 tabular-nums">{formatDate(enc.encounter_date)}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{enc.encounter_type ?? '—'}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{enc.service ?? '—'}</td>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {labs.map((lab: LabResult) => (
                      <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-1 text-xs font-medium text-slate-700">{lab.test_name}</td>
                        <td className="py-3 px-3 text-xs text-slate-500">{formatDate(lab.collected_date ?? lab.released_date)}</td>
                        <td className="py-3 px-3 text-xs text-slate-500 capitalize">{lab.category.replace('_', ' ')}</td>
                        <td className="py-3 px-3"><StatusBadge status={lab.status ?? 'unknown'} /></td>
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
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Type</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-slate-400">Amount</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv: Invoice) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-1 text-xs font-mono text-slate-700">{inv.invoice_number}</td>
                        <td className="py-3 px-3 text-xs text-slate-500 capitalize">{inv.type}</td>
                        <td className="py-3 px-3 text-xs text-right font-medium">{formatCurrency(inv.total_amount)}</td>
                        <td className="py-3 px-3"><StatusBadge status={inv.status ?? 'unknown'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-900">
                This history records custody transfers and related authorization events. Existing patient, encounter, laboratory, and invoice records remain linked and follow the current custodian branch; no duplicate patient is created.
              </div>
              {historyQuery.isLoading ? <TableSkeleton rows={3} cols={4} /> : historyQuery.error ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  {historyQuery.error instanceof Error ? historyQuery.error.message : 'Unable to load interclinic history.'}
                </p>
              ) : (historyQuery.data?.transactions ?? []).length === 0 ? (
                <EmptyState icon={History} title="No interclinic history" description="There are no interclinic access requests for this patient." />
              ) : (
                <div className="space-y-4">
                  {(historyQuery.data?.transactions ?? []).map((transaction) => {
                    const events = (historyQuery.data?.events ?? []).filter((event) => event.consentId === transaction.id);
                    const statusLabel = transaction.effect === 'custody_transfer' && transaction.status === 'approved'
                      ? 'Transferred' : transaction.status.replace(/_/g, ' ');
                    return (
                      <article key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{statusLabel}</p>
                            <p className="mt-1 text-xs text-slate-500">{transaction.sourceBranch} <span aria-hidden="true">&rarr;</span> {transaction.destinationBranch}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{statusLabel}</span>
                        </div>
                        <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
                          <div><dt className="text-slate-400">Purpose</dt><dd className="mt-1 font-medium text-slate-700">{transaction.purpose}</dd></div>
                          <div><dt className="text-slate-400">Requested records</dt><dd className="mt-1 font-medium capitalize text-slate-700">{transaction.scope.map((scope) => scope.replace(/_/g, ' ')).join(', ') || '—'}</dd></div>
                          <div><dt className="text-slate-400">Requested</dt><dd className="mt-1 font-medium text-slate-700">{formatHistoryDate(transaction.requestedAt)}</dd></div>
                          <div><dt className="text-slate-400">Approved</dt><dd className="mt-1 font-medium text-slate-700">{formatHistoryDate(transaction.approvedAt)}</dd></div>
                          {transaction.accessExpiresAt && <div><dt className="text-slate-400">Access expires</dt><dd className="mt-1 font-medium text-slate-700">{formatHistoryDate(transaction.accessExpiresAt)}</dd></div>}
                        </dl>
                        {events.length > 0 && <div className="mt-4 border-t border-slate-100 pt-4">
                          <h3 className="text-xs font-semibold text-slate-700">Transaction events</h3>
                          <ol className="mt-3 space-y-3">
                            {events.map((event) => <li key={event.id} className="flex items-start justify-between gap-3 text-xs">
                              <span className="font-medium text-slate-700">{historyEventLabel(event.eventType)} <span className="font-normal text-slate-400">at {event.branch}</span></span>
                              <time className="shrink-0 text-slate-500">{formatHistoryDate(event.occurredAt)}</time>
                            </li>)}
                          </ol>
                        </div>}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <AddPatientForm
        open={isEditFormOpen} 
        onOpenChange={setIsEditFormOpen} 
        patient={patient} 
      />
    </div>
  );
}
