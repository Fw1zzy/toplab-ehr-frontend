import { Patient, PatientReference } from './patient';

export type EncounterStatus = 'in_progress' | 'completed' | 'unknown';

export interface Encounter {
  id: string;
  encounter_date: string;
  patient_id: string | Patient | PatientReference;
  service: string | null;
  service_id: string | null;
  status: EncounterStatus;
  encounter_type?: string | null;
  company?: string | null;
  corporate_request?: string | null;
  payment_route?: 'Personal Upfront' | 'Company Billed' | 'personal_upfront' | 'company_billed' | null;
  services_selected?: { id: string; name: string; price: number; department: string | null }[];
}
