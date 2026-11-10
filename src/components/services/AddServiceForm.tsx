'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { resultCollections } from '@/lib/api/likha';

interface AddServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLLECTION_LABELS = resultCollections.map((collection) => ({
  value: collection,
  label: collection.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
}));

export function AddServiceForm({ open, onOpenChange }: AddServiceFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [department, setDepartment] = useState('laboratory');
  const [status, setStatus] = useState<'available' | 'unavailable'>('available');
  const [description, setDescription] = useState('');
  const [linkedCollection, setLinkedCollection] = useState('');
  const [labResults, setLabResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createService = useMutation({
    mutationFn: () => api.services.create({
      name: name.trim(),
      price: Number(price),
      department,
      status,
      description: description || null,
      linked_collection: linkedCollection || null,
      lab_results: labResults,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
      setName('');
      setPrice('');
      setDepartment('laboratory');
      setStatus('available');
      setDescription('');
      setLinkedCollection('');
      setLabResults([]);
      setError(null);
      onOpenChange(false);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Unable to save the service to the EHR.'),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    createService.mutate();
  }

  function toggleResult(collection: string) {
    setLabResults((current) => current.includes(collection)
      ? current.filter((item) => item !== collection)
      : [...current, collection]);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div><Dialog.Title className="text-lg font-semibold text-slate-900">Add Service</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Create a catalog service in the EHR.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>

          <form id="add-service-form" onSubmit={submit} className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section>
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">Service Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Service Name <span className="text-red-500">*</span>
                  <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Enter service name" />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">Price <span className="text-red-500">*</span>
                  <input required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="0.00" />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">Department
                  <select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <option value="laboratory">Laboratory</option>
                    <option value="radiology">Radiology</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">Availability
                  <select value={status} onChange={(event) => setStatus(event.target.value as 'available' | 'unavailable')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <option value="available">Available</option>
                    <option value="unavailable">Not Available</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Description
                  <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Optional service description" />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Linked Collection
                  <input value={linkedCollection} onChange={(event) => setLinkedCollection(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Optional collection reference from the EHR" />
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-1 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">Result Collections</h3>
              <p className="mb-3 text-xs text-slate-500">Select the result collections associated with this service.</p>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                {COLLECTION_LABELS.map((item) => <label key={item.value} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={labResults.includes(item.value)} onChange={() => toggleResult(item.value)} className="mt-0.5 accent-blue-600" />
                  <span>{item.label}</span>
                </label>)}
              </div>
            </section>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </form>

          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button></Dialog.Close>
            <button type="submit" form="add-service-form" disabled={createService.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{createService.isPending ? 'Saving...' : 'Save Service'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
