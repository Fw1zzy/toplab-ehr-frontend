import { Patient, PatientReference } from './patient';

export type LabResultStatus = 'for_encoding' | 'with_results';
export type LabCategory =
  | 'hematology'
  | 'clinical_chemistry'
  | 'urinalysis'
  | 'serology'
  | 'microbiology'
  | 'imaging'
  | 'other';

// Normalized list-row fields; the original result fields remain collection-specific in the CMS.
export interface LabResult {
  id: string;
  patient_id: string | Patient | PatientReference;
  encounter_id: string | null;
  test_name: string;
  category: LabCategory;
  status: LabResultStatus | null;
  collected_date: string | null;
  released_date: string | null;
  result_collection: string;
  remarks: string | null;
}
