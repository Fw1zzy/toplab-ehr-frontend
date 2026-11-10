import { PatientReference } from './patient';

export type InvoiceStatus = 'draft' | 'issued' | 'unpaid' | 'paid';
export type InvoiceType = 'Outpatient' | 'Corporate';

export interface Invoice {
  id: string;
  invoice_number: string | null;
  patient_id: string | PatientReference;
  company_id: string | null;
  type: InvoiceType | null;
  status: InvoiceStatus | null;
  total_amount: number;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  service_request: string | null;
}
