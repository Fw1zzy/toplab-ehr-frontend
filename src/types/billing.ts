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

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'gcash' | 'maya' | 'bank_transfer' | 'check';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  date_created: string;
  date_updated: string | null;
  payment_number: string;
  patient_id: string | Patient;
  invoice_id: string | Invoice;
  invoice_number: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  status: PaymentStatus;
  payment_date: string;
  received_by: string | null;
  notes: string | null;
  branch: string | null;
}
