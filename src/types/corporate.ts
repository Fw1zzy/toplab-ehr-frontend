import { Patient } from './patient';

export interface Company {
  id: string;
  name: string;
  contract_status: 'Active' | 'Inactive';
  billing_address: string;
  // Relation: corporate_requests (one-to-many list of associated requests)
  corporate_requests?: string[] | CorporateRequest[];
}

export interface CorporateRequest {
  id: string;
  company_code: string | null;
  company: string | Company;
  request_type: 'PEME (Newly Hired)' | 'APE (Long-time employee)';
  status: 'approved' | 'query' | 'completed';
  schedule_start_date_: string | null;
  schedule_end_date: string | null;
  quoted_price: number | null;
  corporate_request_date_submitted: string | null;
  is_invoiced: boolean;
  finalize_request: boolean;
  notes: string | null;
  patients?: Patient[];
}
