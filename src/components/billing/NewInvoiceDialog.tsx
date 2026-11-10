'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useEncounters } from '@/lib/queries/useEncounters';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { Encounter } from '@/types';
import { formatDate } from '@/lib/utils';

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewInvoiceDialog({ open, onOpenChange }: NewInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const [invoiceKind, setInvoiceKind] = useState<'outpatient' | 'corporate'>('outpatient');
  const [encounterId, setEncounterId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const encountersQuery = useEncounters({ page: 1, limit: 100 });
  const patientsQuery = usePatients({ limit: 100 });
  const companiesQuery = useCompanies();
  const requestsQuery = useQuery({
    queryKey: ['corporate-requests', 'unbilled'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
    enabled: invoiceKind === 'corporate',
  });
  const encounters = (encountersQuery.data?.data ?? []).filter((encounter) => encounter.encounter_type?.startsWith('OPD'));
  const requests = (requestsQuery.data?.data ?? []).filter((request) => !request.is_invoiced);
  const patientNames = useMemo(() => new Map((patientsQuery.data?.data ?? []).map((patient) => [
    patient.id,
    `${patient.first_name} ${patient.last_name}`.trim(),
  ])), [patientsQuery.data]);
  const companyNames = useMemo(() => new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name])), [companiesQuery.data]);

  function patientName(patient: Encounter['patient_id']) {
    if (typeof patient !== 'string') {
      const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
      if (name) return name;
      return patientNames.get(patient.id) ?? 'Unknown patient';
    }
    return patientNames.get(patient) ?? (patientsQuery.isLoading ? 'Loading patient...' : 'Unknown patient');
  }

  const createInvoice = useMutation({
    mutationFn: () => {
      if (invoiceKind === 'outpatient') {
        const encounter = encounters.find((item) => item.id === encounterId);
        if (!encounter) throw new Error('Select an outpatient encounter.');
        return api.invoices.generateForEncounter(encounter);
      }
      if (!requests.some((item) => item.id === requestId)) throw new Error('Select an unbilled corporate request.');
      return api.invoices.generateForCorporateRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['corporate-requests'] });
      setError(null);
      onOpenChange(false);
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : 'Unable to generate invoice in the EHR.';
      setError(/permission|forbidden|403/i.test(message)
        ? 'The EHR denied this invoice flow. The signed-in role needs permission to trigger the invoice flow and create its invoice records.'
        : message);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    createInvoice.mutate();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">New Invoice</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">Select an encounter or corporate request. The EHR generates the invoice and assigns its number and status.</Dialog.Description>
            </div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>
          <form id="new-invoice-form" onSubmit={submit} className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section>
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">Invoice Source</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(['outpatient', 'corporate'] as const).map((kind) => <button key={kind} type="button" onClick={() => { setInvoiceKind(kind); setError(null); }} aria-pressed={invoiceKind === kind} className={`rounded-xl border p-4 text-left transition-colors ${invoiceKind === kind ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-500/10' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className="block text-sm font-semibold capitalize text-slate-900">{kind === 'outpatient' ? 'Outpatient' : 'Corporate'}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{kind === 'outpatient' ? 'Generate from an outpatient encounter.' : 'Generate from an unbilled corporate request.'}</span>
                </button>)}
              </div>
            </section>
            <section>
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">{invoiceKind === 'outpatient' ? 'Encounter' : 'Corporate Request'}</h3>
              {invoiceKind === 'outpatient' ? (
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">Outpatient Encounter <span className="text-red-500">*</span>
                  <select required value={encounterId} onChange={(event) => setEncounterId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">{encountersQuery.isLoading ? 'Loading encounters...' : 'Select an encounter'}</option>
                    {encounters.map((encounter) => <option key={encounter.id} value={encounter.id}>{patientName(encounter.patient_id)} · {formatDate(encounter.encounter_date, 'MMM d, yyyy h:mm a')}</option>)}
                  </select>
                  {!encountersQuery.isLoading && encounters.length === 0 && <span className="block text-[11px] text-slate-400">No outpatient encounters are available to invoice.</span>}
                </label>
              ) : (
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">Unbilled Corporate Request <span className="text-red-500">*</span>
                  <select required value={requestId} onChange={(event) => setRequestId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">{requestsQuery.isLoading ? 'Loading requests...' : 'Select a request'}</option>
                    {requests.map((request) => {
                      const companyId = typeof request.company === 'string' ? request.company : request.company.id;
                      const company = companyNames.get(companyId) ?? 'Company';
                      return <option key={request.id} value={request.id}>{company} · {request.company_code ?? request.request_type}</option>;
                    })}
                  </select>
                  {!requestsQuery.isLoading && requests.length === 0 && <span className="block text-[11px] text-slate-400">No unbilled corporate requests are available.</span>}
                </label>
              )}
            </section>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-900">
              Invoice number, amount, and status are assigned by the EHR workflow. This form does not write read-only invoice fields directly.
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </form>
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button></Dialog.Close>
            <button type="submit" form="new-invoice-form" disabled={createInvoice.isPending || (invoiceKind === 'outpatient' ? encountersQuery.isLoading || encounters.length === 0 : requestsQuery.isLoading || requests.length === 0)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">{createInvoice.isPending ? 'Generating...' : 'Generate Invoice'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
