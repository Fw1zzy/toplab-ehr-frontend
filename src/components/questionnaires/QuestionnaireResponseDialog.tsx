'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { questionnaireResponses } from '@/lib/api/questionnaires';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { QuestionnaireField, QuestionnaireResponse, QuestionnaireSchema, QuestionnaireValue } from '@/types/questionnaire';

export function QuestionnaireResponseDialog({ id, onClose }: { id?: string; onClose: () => void }) {
  const { user } = useAuth();
  const schemaQuery = useQuery({ queryKey: ['questionnaire-schema', user?.id],
    queryFn: ({ signal }) => questionnaireResponses.schema(signal), staleTime: 5 * 60_000 });
  const detailQuery = useQuery({ queryKey: ['questionnaire-response', user?.id, id],
    queryFn: ({ signal }) => questionnaireResponses.get(id!, signal), enabled: !!id, staleTime: 0 });
  const loading = schemaQuery.isLoading || (!!id && detailQuery.isLoading);
  const error = schemaQuery.error ?? detailQuery.error;

  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45" />
      <Dialog.Content onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <Dialog.Title className="sr-only">{id ? 'Edit Questionnaire Response' : 'Add Questionnaire Response'}</Dialog.Title>
        <Dialog.Description className="sr-only">Enter patient history and examination information using the EHR questionnaire fields.</Dialog.Description>
        {loading ? <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Loading EHR questionnaire...</div>
          : error ? <div className="p-6"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error instanceof Error ? error.message : 'Unable to load questionnaire form.'}</p><button type="button" onClick={onClose} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm">Close</button></div>
            : schemaQuery.data && <ResponseForm key={id ?? 'new'} schema={schemaQuery.data} response={detailQuery.data} onClose={onClose} />}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ResponseForm({ schema, response, onClose }: { schema: QuestionnaireSchema; response?: QuestionnaireResponse; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState(response?.patient.id ?? '');
  const [patientSearch, setPatientSearch] = useState('');
  const settledSearch = useDebouncedValue(patientSearch);
  const [group, setGroup] = useState('general');
  const [changes, setChanges] = useState<Record<string, QuestionnaireValue>>(response ? {} : { status: 'draft' });
  const [error, setError] = useState<string | null>(null);
  const patientsQuery = useQuery({ queryKey: ['questionnaire-patients', user?.id, settledSearch],
    queryFn: ({ signal }) => questionnaireResponses.patients(settledSearch, signal), enabled: !response, staleTime: 15_000 });
  const values = { ...response?.values, ...changes };
  const groups = schema.groups.filter((item) => item.id === 'general' || schema.fields.some((field) => field.group === item.id));
  const fields = schema.fields.filter((field) => field.group === group);
  const mutation = useMutation({
    mutationFn: () => questionnaireResponses.save({ id: response?.id, patientId, values: changes }),
    onSuccess: async () => {
      // Re-fetch after writes so the EHR's audit/flow-generated values are read back.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questionnaire-responses'] }),
        queryClient.invalidateQueries({ queryKey: ['questionnaire-response'] }),
      ]);
      toast.success(response ? 'Questionnaire response updated' : 'Questionnaire response added');
      onClose();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Unable to save questionnaire response.'),
  });

  function setAnswer(name: string, value: QuestionnaireValue) {
    setChanges((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function save() {
    if (!patientId) { setError('Select a patient from your branch.'); setGroup('general'); return; }
    for (const field of schema.fields.filter((item) => item.required && !item.readonly)) {
      const value = values[field.name];
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
        setGroup(field.group);
        setError(`${field.label} is required.`);
        return;
      }
    }
    setError(null);
    mutation.mutate();
  }

  return <>
    <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div><h2 className="text-lg font-semibold text-slate-900">{response ? 'Edit Questionnaire Response' : 'Add Questionnaire Response'}</h2><p className="mt-1 text-xs text-slate-500">{response ? `${response.patient.first_name} ${response.patient.last_name}` : 'Patient history and physical examination'} · Fields match the EHR backend</p></div>
      <button type="button" disabled={mutation.isPending} onClick={onClose} aria-label="Close questionnaire form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
    </header>
    <div className="border-b border-slate-100 bg-slate-50/70 px-3 sm:px-5"><nav aria-label="Questionnaire sections" className="flex gap-1 overflow-x-auto">{groups.map((item) => <button type="button" key={item.id} onClick={() => setGroup(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold ${group === item.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.label}</button>)}</nav></div>
    <div className="flex-1 overflow-y-auto p-5 sm:p-6">
      <fieldset disabled={mutation.isPending} className="space-y-5">
        <div><h3 className="text-sm font-semibold text-slate-900">{groups.find((item) => item.id === group)?.label}</h3><p className="mt-1 text-xs text-slate-500">Leave unanswered fields blank. Saving does not run the EHR&apos;s patient-confirmation flow.</p></div>
        {group === 'general' && <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="text-xs font-semibold text-slate-700">Patient <span className="text-red-600">*</span></h4>
          {response ? <div><p className="text-sm font-medium text-slate-800">{response.patient.first_name} {response.patient.last_name}</p><p className="mt-1 text-[11px] text-slate-500">The patient association is fixed to protect the integrity of an existing response.</p></div>
            : <>
              <input type="search" value={patientSearch} onChange={(event) => { setPatientSearch(event.target.value); setPatientId(''); }} aria-label="Search branch patients" placeholder="Search patient name..." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)} aria-label="Select questionnaire patient" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">{patientsQuery.isLoading ? 'Loading patients...' : 'Choose patient...'}</option>{patientsQuery.data?.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}</select>
              <p className="text-[11px] text-slate-500">Shows up to 25 matching branch patients. Search by name to find more.</p>
              {patientsQuery.error && <p role="alert" className="text-xs text-red-700">{patientsQuery.error instanceof Error ? patientsQuery.error.message : 'Unable to load patients.'}</p>}
            </>}
          {response && <p className="text-xs text-slate-500">EHR confirmation: <strong>{response.is_finalized ? 'Confirmed' : 'Not confirmed'}</strong></p>}
        </section>}
        <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <QuestionnaireInput key={field.name} field={field} value={values[field.name] ?? null} onChange={(value) => setAnswer(field.name, value)} />)}</div>
      </fieldset>
    </div>
    <footer className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-slate-500">{response ? 'Only changed answers are saved.' : 'New responses default to Draft.'}</span><div className="flex gap-2"><button type="button" onClick={onClose} disabled={mutation.isPending} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="button" onClick={save} disabled={mutation.isPending || (!!response && !Object.keys(changes).length)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{mutation.isPending ? 'Saving...' : 'Save Response'}</button></div></div>
    </footer>
  </>;
}

function QuestionnaireInput({ field, value, onChange }: { field: QuestionnaireField; value: QuestionnaireValue; onChange: (value: QuestionnaireValue) => void }) {
  const title = <span className="text-xs font-semibold text-slate-700">{field.label}{field.required && <span className="ml-1 text-red-600">*</span>}</span>;
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50';
  if (field.readonly) return <div className="space-y-1.5">{title}<p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{value == null || value === '' ? 'Calculated by EHR when available' : String(value)}</p></div>;
  if (field.interface === 'select-radio') return <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3"><legend className="px-1">{title}</legend><div className="flex flex-wrap items-center gap-4">{field.choices.map((choice) => <label key={choice.value} className="flex items-center gap-2 text-xs text-slate-700"><input type="radio" name={field.name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} className="accent-blue-600" />{choice.label}</label>)}{!field.required && value != null && <button type="button" onClick={() => onChange(null)} className="text-[11px] text-slate-400 hover:text-blue-700">Clear</button>}</div></fieldset>;
  if (field.interface === 'select-multiple-checkbox') return <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3"><legend className="px-1">{title}</legend><div className="flex flex-wrap gap-4">{field.choices.map((choice) => <label key={choice.value} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={Array.isArray(value) && value.includes(choice.value)} onChange={(event) => { const selected = Array.isArray(value) ? value : []; onChange(event.target.checked ? [...selected, choice.value] : selected.filter((item) => item !== choice.value)); }} className="accent-blue-600" />{choice.label}</label>)}</div></fieldset>;
  if (field.choices.length) return <label className="block space-y-1.5">{title}<select value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value || null)} className={inputClass}><option value="">Choose...</option>{field.choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>;
  const numeric = ['integer', 'float', 'decimal', 'bigInteger'].includes(field.type);
  const dateTime = ['dateTime', 'timestamp'].includes(field.type);
  let rendered = value == null ? '' : String(value);
  if (dateTime && rendered) {
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(rendered) ? rendered : `${rendered}Z`);
    if (Number.isFinite(date.getTime())) rendered = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return <label className="block space-y-1.5">{title}<input type={numeric ? 'number' : dateTime ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'} step={['integer', 'bigInteger'].includes(field.type) ? '1' : numeric ? 'any' : undefined} maxLength={field.maxLength ?? undefined} placeholder={field.placeholder} value={rendered} onChange={(event) => {
    const next = event.target.value;
    onChange(!next ? null : dateTime ? new Date(next).toISOString() : next);
  }} className={inputClass} /></label>;
}
