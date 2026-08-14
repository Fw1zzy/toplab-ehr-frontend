export type PatientStatus = 'active' | 'inactive' | 'deceased';
export type Sex = 'male' | 'female' | 'other';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated';

export interface Patient {
  id: string;
  date_created: string;
  date_updated: string | null;
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  date_of_birth: string;
  sex: Sex;
  civil_status: CivilStatus | null;
  nationality: string | null;
  religion: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  contact_number: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  philhealth_number: string | null;
  sss_number: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_history: string | null;
  family_history: string | null;
  social_history: string | null;
  status: PatientStatus;
  branch: string | null;
  user_id: string | null; // directus_users FK
}

export interface Company {
  id: string;
  name: string;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  tin: string | null;
  status: 'active' | 'inactive';
}

export interface CompanyPatient {
  id: string;
  patient_id: string | Patient;
  company_id: string | Company;
  employee_id: string | null;
  date_created: string;
}

export interface PatientWithAge extends Patient {
  age: number;
  fullName: string;
}
