'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useCreateCorporateRequest } from '@/lib/queries/useCorporateRequests';
import { CorporateRequest } from '@/types';

interface AddCorporateRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCorporateRequestForm({ open, onOpenChange }: AddCorporateRequestFormProps) {
  const { data: companiesResult } = useCompanies();
  const companies = companiesResult?.data ?? [];
  const { mutateAsync, isPending } = useCreateCorporateRequest();
  const [company, setCompany] = useState('');
  const [requestType, setRequestType] = useState<CorporateRequest['request_type']>('PEME (Newly Hired)');
  const [status, setStatus] = useState<CorporateRequest['status']>('query');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await mutateAsync({
        company,
        request_type: requestType,
        status,
        schedule_start_date_: scheduleStart ? new Date(scheduleStart).toISOString() : null,
        schedule_end_date: scheduleEnd ? new Date(scheduleEnd).toISOString() : null,
        quoted_price: quotedPrice ? Number(quotedPrice) : null,
        notes: notes || null,
      });
      setCompany('');
      setScheduleStart('');
      setScheduleEnd('');
      setQuotedPrice('');
      setNotes('');
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the request to the EHR.');
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">New Corporate Request</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">Create a request in the EHR.</Dialog.Description>
            </div>
            <Dialog.Close asChild><button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>
          <form id="corporate-request-form" onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto p-6">
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Company <span className="text-red-500">*</span>
              <select required value={company} onChange={(event) => setCompany(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                <option value="">Select a company</option>
                {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Request Type
                <select value={requestType} onChange={(event) => setRequestType(event.target.value as CorporateRequest['request_type'])} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                  <option value="PEME (Newly Hired)">PEME (Newly Hired)</option>
                  <option value="APE (Long-time employee)">APE (Long-time employee)</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Status
                <select value={status} onChange={(event) => setStatus(event.target.value as CorporateRequest['status'])} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                  <option value="query">Query</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Schedule Start
                <input type="datetime-local" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Schedule End
                <input type="datetime-local" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
            </div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Quoted Price
              <input type="number" min="0" step="0.01" value={quotedPrice} onChange={(event) => setQuotedPrice(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Notes
              <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </form>
          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Cancel</button></Dialog.Close>
            <button type="submit" form="corporate-request-form" disabled={isPending || companies.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? 'Saving...' : 'Save Request'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
