import { Patient } from './patient';
import { Encounter } from './encounter';

export interface QuestionnaireResponse {
  id: string;
  date_created: string;
  date_updated: string | null;
  patient_id: string | Patient;
  encounter_id: string | Encounter | null;
  questionnaire_id: string | null;
  questionnaire_name: string | null;
  answers: Record<string, unknown>;
  status: 'draft' | 'completed';
  submitted_at: string | null;
}
