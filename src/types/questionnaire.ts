export type QuestionnaireValue = string | number | boolean | string[] | null;

export interface QuestionnaireField {
  name: string;
  label: string;
  group: string;
  type: string;
  interface: string | null;
  required: boolean;
  readonly: boolean;
  maxLength: number | null;
  placeholder: string;
  choices: Array<{ label: string; value: string }>;
}

export interface QuestionnaireSchema {
  fields: QuestionnaireField[];
  groups: Array<{ id: string; label: string }>;
}

export interface QuestionnairePatient {
  id: string;
  first_name: string;
  last_name: string;
}

export interface QuestionnaireResponse {
  id: string;
  patient: QuestionnairePatient;
  status: 'draft' | 'published' | 'archived';
  is_finalized: boolean;
  date_created: string | null;
  date_updated: string | null;
  submitted_at?: string | null;
  values?: Record<string, QuestionnaireValue>;
}
