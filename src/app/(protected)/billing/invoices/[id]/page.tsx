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
import { formatCurrency } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.invoices.getOne(id),
    enabled: !!id,
  });

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      return api.invoices.receivePayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    }
  });
  const lineItemsQuery = useQuery({
    queryKey: ['invoice-line-items', id],
    queryFn: () => api.invoices.getLineItems(id),
    enabled: !!id,
  });
  const patientsQuery = usePatients({ limit: 100 });
  const companiesQuery = useCompanies();
  const patientNames = new Map((patientsQuery.data?.data ?? []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]));
  const companyNames = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));

  const generateStatementMutation = useMutation({
    mutationFn: () => api.invoices.generateBillingStatement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
      setIsGenerateModalOpen(false);
    },
  });

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (!invoice) return (
    <EmptyState icon={FileText} title="Invoice not found" action={
      <button onClick={() => router.push('/billing/invoices')} className="text-blue-600 hover:underline">Back</button>
    } />
  );

  const isCorporate = invoice.type === 'Corporate';
  const lineItems = lineItemsQuery.data ?? [];
  
  let patientName = '—';
  if (invoice.patient_id) {
    const patientId = typeof invoice.patient_id === 'string' ? invoice.patient_id : invoice.patient_id.id;
    patientName = typeof invoice.patient_id !== 'string'
      ? `${invoice.patient_id.first_name ?? ''} ${invoice.patient_id.last_name ?? ''}`.trim() || patientNames.get(patientId) || 'Unknown patient'
      : patientNames.get(patientId) ?? (patientsQuery.isLoading ? 'Loading patient...' : 'Unknown patient');
  }
  const companyName = invoice.company_id ? companyNames.get(invoice.company_id) ?? (companiesQuery.isLoading ? 'Loading company...' : 'Unknown company') : '—';

  const confirmGenerate = () => {
    generateStatementMutation.mutate();
  };

  const confirmPayment = () => {
    updateInvoiceMutation.mutate();
    setIsPaymentModalOpen(false);
  };

  const isPaid = invoice.status === 'paid';
  const canGenerateStatement = invoice.status === 'draft';

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
            <h2 className="text-2xl font-bold text-blue-600 font-mono tracking-tight">{invoice.invoice_number ?? 'Invoice'}</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={invoice.status ?? 'unknown'} />
          </div>
        </div>

        {/* Middle Section (Details) */}
        <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:gap-8 sm:p-6 lg:gap-10 lg:p-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Billed To</p>
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-lg">
                {isCorporate ? <Building2 className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-blue-600" />}
                <span>{isCorporate ? companyName : patientName}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <p className="text-sm font-medium text-slate-500 mb-1">Invoice Total</p>
              <span className="text-3xl font-bold text-slate-900 tracking-tight">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Account Type</p>
              <p className="text-slate-900 font-medium">
                {invoice.type ?? '—'}
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

        <section className="border-t border-slate-100 px-5 py-5 sm:px-8" aria-label="Invoice line items">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Invoice Line Items</h2>
          {lineItemsQuery.isLoading ? <p className="text-xs text-slate-400">Loading line items...</p> : lineItemsQuery.error ? (
            <p role="alert" className="text-xs text-amber-700">Invoice lines are not available to this account.</p>
          ) : lineItems.length === 0 ? (
            <p className="text-xs text-slate-400">The EHR returned no line-item records for this invoice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="py-2 pr-4 font-medium">Description</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{lineItems.map((item) => <tr key={item.id}><td className="py-3 pr-4 text-xs text-slate-700">{item.description || '—'}</td><td className="py-3 text-right text-xs font-medium text-slate-800">{formatCurrency(item.amount)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>

        {/* Actions Footer */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-start gap-4">
          {(generateStatementMutation.error || updateInvoiceMutation.error) && <p role="alert" className="my-auto text-xs text-red-600">{(generateStatementMutation.error || updateInvoiceMutation.error) instanceof Error ? (generateStatementMutation.error || updateInvoiceMutation.error)?.message : 'Invoice action failed.'}</p>}
          {canGenerateStatement ? (
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
              The EHR will run its configured billing-statement workflow for this invoice.
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
                disabled={generateStatementMutation.isPending}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                {generateStatementMutation.isPending ? 'Generating...' : 'Confirm Generation'}
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
              The EHR will run its configured receive-payment workflow and update the invoice status.
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
                disabled={updateInvoiceMutation.isPending}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                {updateInvoiceMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
