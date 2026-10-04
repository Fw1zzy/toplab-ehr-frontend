'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, FileText, CheckCircle2, Building2, User } from 'lucide-react';
import Image from 'next/image';
import paidImg from '@/images/PAID.png';
import unpaidImg from '@/images/UNPAID.png';
import issuedImg from '@/images/ISSUED.png';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '@/lib/api';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { getPatientFullName, formatDate } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.invoices.getOne(id),
    enabled: !!id,
  });

  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const updateInvoiceMutation = useMutation({
    mutationFn: async (status: string) => {
      // Call the mock api to ensure the status is actually persisted
      return api.invoices.update(id, { status: status as any });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['invoices', id], updated);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (!invoice) return (
    <EmptyState icon={FileText} title="Invoice not found" action={
      <button onClick={() => router.push('/billing/invoices')} className="text-blue-600 hover:underline">Back</button>
    } />
  );

  const isCorporate = invoice.type === 'company';
  
  let patientName = '—';
  if (invoice.patient_id) {
    const pId = typeof invoice.patient_id === 'string' ? invoice.patient_id : (invoice.patient_id as any).id;
    const p = MOCK_PATIENTS.find(pt => pt.id === pId);
    if (p) patientName = getPatientFullName(p);
  }

  const confirmGenerate = () => {
    setIsGenerated(true);
    setIsGenerateModalOpen(false);
  };

  const confirmPayment = () => {
    updateInvoiceMutation.mutate('paid');
    setIsPaymentModalOpen(false);
  };

  const isPaid = invoice.status === 'paid';

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/billing/invoices')} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Details</h1>
            <p className="text-sm text-slate-500 mt-0.5">View and manage billing statement</p>
          </div>
        </div>
      </div>

      {/* Invoice Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        
        {/* Top Section */}
        <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice Number</p>
            <h2 className="text-2xl font-bold text-blue-600 font-mono tracking-tight">{invoice.invoice_number}</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-slate-500">{formatDate(invoice.invoice_date)}</span>
          </div>
        </div>

        {/* Middle Section (Details) */}
        <div className="p-8 grid grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Billed To</p>
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-lg">
                {isCorporate ? <Building2 className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-blue-600" />}
                <span>{isCorporate ? (invoice.company_id || '—') : patientName}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <p className="text-sm font-medium text-slate-500 mb-1">Total Amount Due</p>
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                ₱ {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Account Type</p>
              <p className="text-slate-900 font-medium">
                {isCorporate ? 'Corporate (B2B)' : 'Outpatient (Personal)'}
              </p>
            </div>
            
            <div className="pt-6 border-t border-slate-100 mt-6 flex justify-start">
              {invoice.status === 'paid' && (
                <Image src={paidImg} alt="Paid" height={80} className="object-contain" />
              )}
              {invoice.status === 'unpaid' && (
                <Image src={unpaidImg} alt="Unpaid" height={80} className="object-contain" />
              )}
              {invoice.status === 'issued' && (
                <Image src={issuedImg} alt="Issued" height={80} className="object-contain" />
              )}
              {invoice.status === 'draft' && (
                <span className="text-sm font-bold text-slate-400 border-2 border-slate-300 px-6 py-2 rounded-lg uppercase tracking-widest rotate-[-5deg]">Draft</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-start gap-4">
          {!isGenerated && !isPaid ? (
            <button 
              type="button" 
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
            >
              <FileText className="h-4 w-4" /> Generate Actual Billing Statement
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => {
                if (!isPaid) setIsPaymentModalOpen(true);
              }}
              disabled={isPaid || updateInvoiceMutation.isPending}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] ${
                isPaid 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPaid ? <CheckCircle2 className="h-5 w-5 text-white" /> : <DollarSign className="h-5 w-5" />}
              {updateInvoiceMutation.isPending ? 'Processing...' : (isPaid ? 'Payment Received' : 'Receive Payment')}
            </button>
          )}
        </div>
      </div>

      {/* Generate Statement Modal */}
      <Dialog.Root open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-6 animate-in zoom-in-95 duration-200">
            <Dialog.Title className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
              Generate Statement
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to generate the final billing statement? This action locks the invoice amounts.
            </Dialog.Description>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmGenerate}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                Confirm Generation
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Receive Payment Modal */}
      <Dialog.Root open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-6 animate-in zoom-in-95 duration-200">
            <Dialog.Title className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
              Receive Payment
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to mark this invoice as paid? This action will formally record the receipt of funds and cannot be undone.
            </Dialog.Description>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                Confirm Payment
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
