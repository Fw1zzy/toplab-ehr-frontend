'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Company } from '@/types/corporate';

interface AddCompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCompany: (company: Omit<Company, 'id'>) => void;
  company?: Company;
}

export function AddCompanyForm({ open, onOpenChange, onAddCompany, company }: AddCompanyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    contract_status: 'Active' as 'Active' | 'Inactive',
    billing_address: '',
  });

  useEffect(() => {
    if (open) {
      if (company) {
        setFormData({
          name: company.name,
          contract_status: company.contract_status,
          billing_address: company.billing_address,
        });
      } else {
        setFormData({
          name: '',
          contract_status: 'Active',
          billing_address: '',
        });
      }
    }
  }, [open, company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCompany(formData);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 z-40 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:border-l sm:border-slate-200 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {company ? 'Edit Company' : 'Add New Company'}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1">
                {company ? "Update the company's information." : "Enter the company's profile and billing details."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <form id="add-company-form" onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Company Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-medium text-slate-700">Company Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. TechFlow Solutions"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="contract_status" className="text-xs font-medium text-slate-700">Contract Status <span className="text-red-500">*</span></label>
                    <select
                      id="contract_status"
                      name="contract_status"
                      required
                      value={formData.contract_status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="billing_address" className="text-xs font-medium text-slate-700">Billing Address <span className="text-red-500">*</span></label>
                    <textarea
                      id="billing_address"
                      name="billing_address"
                      required
                      rows={3}
                      value={formData.billing_address}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder:text-slate-400"
                      placeholder="Full billing address"
                    />
                  </div>
                </div>
              </section>
            </form>
          </div>

          <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="submit"
              form="add-company-form"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Save Company
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
