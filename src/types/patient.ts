export type Sex = 'male' | 'female' | 'other';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated';

export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  date_of_birth: string | null;
  sex: Sex | null;
  civil_status: CivilStatus | null;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  company_id?: string | null;
  valid_id_presented?: string | null;
  valid_id_number?: string | null;
  global_patient_id: string | null;
  origin_branch_id: string | null;
  custodian_branch_id: string | null;
  custody_state: 'active' | 'transferred_out' | null;
  user_id: string | null; // directus_users FK
  avatar_id?: string | null;
}

export type PatientReference = Pick<Patient, 'id'> & Partial<Pick<Patient, 'first_name' | 'last_name'>>;
