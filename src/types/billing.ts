import { Patient } from './patient';

export type InvoiceStatus = 'draft' | 'issued' | 'unpaid' | 'paid' | 'cancelled' | 'refunded';
export type InvoiceType = 'individual' | 'company' | 'philhealth' | 'hmo';

export interface Invoice {
  id: string;
  date_created: string;
  date_updated: string | null;
  invoice_number: string;
  patient_id: string | Patient;
  company_id: string | null;
  type: InvoiceType;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  balance: number;
  notes: string | null;
  branch: string | null;
  created_by: string | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string | Invoice;
  service_id: string | null;
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}
