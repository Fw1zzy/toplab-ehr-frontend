'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

interface AddInventoryItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInventoryItemForm({ open, onOpenChange }: AddInventoryItemFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [stock, setStock] = useState('0');
  const [unit, setUnit] = useState('');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const createItem = useMutation({
    mutationFn: () => api.inventory.create({
      name: name.trim(),
      current_stock: Number(stock),
      unit: unit.trim(),
      minimum_stock: Number(reorderLevel),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setName('');
      setStock('0');
      setUnit('');
      setReorderLevel('0');
      setError(null);
      onOpenChange(false);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Unable to save inventory item to the EHR.'),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    createItem.mutate();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div><Dialog.Title className="text-lg font-semibold text-slate-900">Add Inventory Item</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Create an item using the fields available in the EHR.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>
          <form id="add-inventory-item-form" onSubmit={submit} className="flex-1 space-y-5 overflow-y-auto p-6">
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Item Name <span className="text-red-500">*</span>
              <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Current Stock <span className="text-red-500">*</span>
                <input required type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Unit of Measure <span className="text-red-500">*</span>
                <input required value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="e.g. box, vial, piece" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Reorder Level <span className="text-red-500">*</span>
                <input required type="number" min="0" step="1" value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              </label>
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </form>
          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Cancel</button></Dialog.Close>
            <button type="submit" form="add-inventory-item-form" disabled={createItem.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{createItem.isPending ? 'Saving...' : 'Save Item'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
