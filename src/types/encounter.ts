import { Patient } from './patient';

export type EncounterStatus =
  | 'scheduled'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Encounter {
  id: string;
  date_created: string;
  date_updated: string | null;
  encounter_date: string;
  patient_id: string | Patient;
  provider_id: string | null;
  provider_name: string | null;
  chief_complaint: string | null;
  clinical_notes: string | null;
  diagnosis: string | null;
  service: string | null;
  service_id: string | null;
  status: EncounterStatus;
  branch: string | null;
  queue_number: number | null;
  waiting_since: string | null;
  ai_summary: string | null;
  encounter_type?: 'OPD' | 'PEME' | 'APE';
  company?: string | null;
  corporate_request?: string | null;
  payment_route?: 'Personal Upfront' | 'Company Billed' | null;
  services_selected?: { name: string; price: number }[];
}

export interface EncounterPatient {
  id: string;
  encounter_id: string | Encounter;
  patient_id: string | Patient;
  date_created: string;
}
