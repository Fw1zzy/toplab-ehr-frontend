import { Patient } from './patient';

export type RecordType =
  | 'consultation'
  | 'laboratory'
  | 'follow_up'
  | 'emergency'
  | 'procedure';

export type MedicalRecordStatus = 'active' | 'finalized' | 'amended';

export interface VitalSigns {
  blood_pressure: string | null;
  heart_rate: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date: string | null;
}

export interface MedicalRecord {
  id: string;
  date_created: string;
  date_updated: string | null;
  patient_id: string | Patient;
  encounter_id: string | null;
  record_date: string;
  record_type: RecordType;
  chief_complaint: string | null;
  diagnosis: string | null;
  clinical_notes: string | null;
  vital_signs: VitalSigns | null;
  medications: Medication[];
  lab_result_ids: string[];
  provider_name: string | null;
  status: MedicalRecordStatus;
  branch: string | null;
}
