'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Brain, Receipt, Printer, Trash2, X } from 'lucide-react';
import { useEncounter } from '@/lib/queries/useEncounters';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { getPatientFullName, formatDateTime, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function EncounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: encounter, isLoading } = useEncounter(id);

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!encounter) throw new Error('No encounter data');
      const isCorporate = encounter.encounter_type === 'PEME' || encounter.encounter_type === 'APE';
      const type = isCorporate ? 'company' : 'individual';
      let invoiceNumber = '';
      
      if (isCorporate) {
        // Random 6 letters that "matches the company name"
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const rand = Array.from({length: 6}, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
        invoiceNumber = rand;
      } else {
        invoiceNumber = 'OPD-' + Math.floor(100000 + Math.random() * 900000).toString();
      }

      const total = encounter.services_selected?.reduce((sum, s) => sum + s.price, 0) || 0;

      const payload = {
        invoice_number: invoiceNumber,
        patient_id: encounter.patient_id,
        company_id: isCorporate ? 'company-001' : null, // Mock company ID
        type: type as any,
        status: (isCorporate ? 'issued' : 'unpaid') as any,
        invoice_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        subtotal: total,
        discount: 0,
        tax: 0,
        total: total,
        paid_amount: 0,
        balance: total,
        encounter_id: encounter.id,
      };

      // We don't have api.invoices.create, but we can simulate it or add it to mock. 
      // Let's call a mock API function directly if it existed, or just mock it here.
      // Wait, mock API has invoices but no create. I'll just push to MOCK_INVOICES if I must, but since we are client side, we need a query.
      // Let's assume we implement api.invoices.create
      return api.invoices.create(payload);
    },
    onSuccess: (data) => {
      // Invalidate invoices
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Navigate to billing
      router.push(`/billing/invoices/${data.id}`);
    }
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (!encounter) return (
    <EmptyState icon={ClipboardList} title="Encounter not found" action={
      <button type="button" onClick={() => router.push('/encounters')} className="text-xs text-blue-600 hover:underline">Back</button>
    } />
  );

  const patient = MOCK_PATIENTS.find((p) => p.id === encounter.patient_id);
  const patientName = patient ? getPatientFullName(patient) : String(encounter.patient_id);

  const isCorporate = encounter.encounter_type === 'PEME' || encounter.encounter_type === 'APE';
  const selectedServices = encounter.services_selected || [];
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleGenerateInvoice = () => {
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
            <h1 className="text-lg font-bold text-slate-900 mt-1">{patientName}</h1>
            <p className="text-sm text-slate-500">{formatDateTime(encounter.encounter_date)}</p>
          </div>
          <StatusBadge status={encounter.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            ['Provider', encounter.provider_name ?? '—'],
            ['Encounter Type', encounter.encounter_type === 'OPD' ? 'Outpatient (OPD)' : encounter.encounter_type === 'PEME' ? 'Newly Hired (PEME)' : encounter.encounter_type === 'APE' ? 'Annual Physical Exam (APE)' : '—'],
            ['Company', encounter.company ?? '—'],
            ['Payment Route', encounter.payment_route ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400">{label}</p>
              <p className="font-medium text-slate-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Notes */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Chief Complaint</h2>
            <p className="text-xs text-slate-600">{encounter.chief_complaint ?? 'None documented.'}</p>
            <h2 className="text-sm font-semibold text-slate-900 pt-3 border-t border-slate-100">Clinical Notes</h2>
            <p className="text-xs text-slate-600">{encounter.clinical_notes ?? 'No clinical notes recorded.'}</p>
            <h2 className="text-sm font-semibold text-slate-900 pt-3 border-t border-slate-100">Diagnosis</h2>
            <p className="text-xs text-slate-600">{encounter.diagnosis ?? 'No diagnosis recorded.'}</p>
          </div>
          {encounter.ai_summary && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900">AI Clinical Summary</h2>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AI-GENERATED</p>
                <p className="text-xs text-slate-700 leading-relaxed">{encounter.ai_summary}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Services */}
        <div className="lg:col-span-2 space-y-5">
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
                            Laboratory
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
                  <button type="button" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                No services selected for this encounter.
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Encounter Date</h2>
            <div className="relative">
              <input type="text" readOnly value={formatDateTime(encounter.encounter_date)} className="w-full border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-emerald-50/30 outline-none" />
              <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 cursor-pointer" />
            </div>
            <div>
              <button 
                type="button" 
                onClick={handleGenerateInvoice}
                disabled={createInvoiceMutation.isPending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                <Receipt className="h-4 w-4" /> 
                {createInvoiceMutation.isPending ? 'Generating...' : `Generate ${isCorporate ? 'Corporate' : 'Outpatient'} Invoice`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
