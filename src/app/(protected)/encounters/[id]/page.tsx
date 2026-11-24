'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Receipt } from 'lucide-react';
import { useEncounter } from '@/lib/queries/useEncounters';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { useState } from 'react';

export default function EncounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const { data: encounter, isLoading } = useEncounter(id);
  const patientsQuery = usePatients({ limit: 100 });
  const companiesQuery = useCompanies();
  const requestsQuery = useQuery({
    queryKey: ['corporate-requests', 'encounter-labels'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
  });
  const isCorporate = encounter?.encounter_type?.startsWith('PEME') || encounter?.encounter_type?.startsWith('APE') || false;
  const outpatientInvoiceQuery = useQuery({
    queryKey: ['outpatient-invoice-for-encounter', id],
    queryFn: () => api.invoices.hasOutpatientInvoiceForEncounter(id),
    enabled: !!encounter && !isCorporate,
    staleTime: 30_000,
  });
  const patientNames = new Map((patientsQuery.data?.data ?? []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]));
  const companyNames = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));
  const requestNames = new Map((requestsQuery.data?.data ?? []).map((request) => [request.id, request.company_code || request.request_type]));

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!encounter) throw new Error('No encounter data');
      return api.invoices.generateForEncounter(encounter);
    },
    onSuccess: async () => {
      if (isCorporate) router.push('/billing/invoices');
      else setInvoiceGenerated(true);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['outpatient-invoice-for-encounter', id] });
    }
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (!encounter) return (
    <EmptyState icon={ClipboardList} title="Encounter not found" action={
      <button type="button" onClick={() => router.push('/encounters')} className="text-xs text-blue-600 hover:underline">Back</button>
    } />
  );

  const patientId = typeof encounter.patient_id === 'string' ? encounter.patient_id : encounter.patient_id.id;
  const patientName = typeof encounter.patient_id !== 'string'
    ? `${encounter.patient_id.first_name ?? ''} ${encounter.patient_id.last_name ?? ''}`.trim() || patientNames.get(patientId)
    : patientNames.get(patientId);
  const companyName = encounter.company ? companyNames.get(encounter.company) ?? 'Unknown company' : '—';
  const corporateRequestName = encounter.corporate_request
    ? requestNames.get(encounter.corporate_request) ?? 'Corporate request'
    : '—';

  const selectedServices = encounter.services_selected || [];
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const outpatientInvoiceExists = invoiceGenerated || outpatientInvoiceQuery.data === true;

  const handleGenerateInvoice = () => {
    if (!isCorporate && selectedServices.length === 0) return;
    if (!isCorporate && outpatientInvoiceExists) return;
    createInvoiceMutation.mutate();
  };

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push('/encounters')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors" id="back-to-encounters">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Encounters
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-mono">{encounter.id}</p>
             <h1 className="text-lg font-bold text-slate-900 mt-1">{patientName || (patientsQuery.isLoading ? 'Loading patient...' : 'Unknown patient')}</h1>
            <p className="text-sm text-slate-500">{formatDateTime(encounter.encounter_date)}</p>
          </div>
          <StatusBadge status={encounter.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            ['Encounter Type', encounter.encounter_type ?? '—'],
            ['Company', companyName],
            ['Corporate Request', corporateRequestName],
            ['Payment Route', encounter.payment_route ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400">{label}</p>
              <p className="font-medium text-slate-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900">Service</h2>
              <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{selectedServices.length} Items</span>
            </div>
            
            {selectedServices.length > 0 ? (
              <div className="p-4">
                <div className="border border-emerald-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50 border-b border-emerald-800 text-emerald-900">
                        <th className="px-4 py-2 text-left font-semibold">Service Name</th>
                        <th className="px-4 py-2 text-left font-semibold border-l border-emerald-800">Price</th>
                        <th className="px-4 py-2 text-left font-semibold border-l border-emerald-800">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-800">
                      {selectedServices.map((srv, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-emerald-900">{srv.name}</td>
                          <td className="px-4 py-2 text-emerald-900 border-l border-emerald-800 tabular-nums font-mono text-xs">
                            {formatCurrency(srv.price)}
                          </td>
                          <td className="px-4 py-2 text-emerald-900 border-l border-emerald-800 capitalize">
                            {srv.department ?? '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50 font-semibold text-emerald-900 border-t-2 border-emerald-800">
                        <td className="px-4 py-2 text-right">TOTAL PRICE</td>
                        <td colSpan={2} className="px-4 py-2 border-l border-emerald-800 tabular-nums font-mono text-sm">
                          {formatCurrency(totalPrice)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-center">
                </div>
              </div>
            ) : (
              <div role="alert" className="m-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">No services selected</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">This encounter has no selected services.{!isCorporate && ' An outpatient invoice cannot be generated until at least one service is selected.'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Encounter Date</h2>
            <div className="relative">
              <input type="text" readOnly value={formatDateTime(encounter.encounter_date)} className="w-full border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-emerald-50/30 outline-none" />
            </div>
            <div>
              {!isCorporate && outpatientInvoiceExists ? (
                <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 flex-none" />An outpatient invoice has already been generated for this encounter.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={createInvoiceMutation.isPending || (!isCorporate && (selectedServices.length === 0 || outpatientInvoiceQuery.isLoading))}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Receipt className="h-4 w-4" />
                  {createInvoiceMutation.isPending ? 'Generating...' : !isCorporate && outpatientInvoiceQuery.isLoading ? 'Checking invoice...' : `Generate ${isCorporate ? 'Corporate' : 'Outpatient'} Invoice`}
                </button>
              )}
              {createInvoiceMutation.error && <p role="alert" className="mt-3 text-xs text-red-600">{createInvoiceMutation.error instanceof Error ? createInvoiceMutation.error.message : 'Unable to generate invoice.'}</p>}
            </div>
          </div>
      </div>
    </div>
  );
}
