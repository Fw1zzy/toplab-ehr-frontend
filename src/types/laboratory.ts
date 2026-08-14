import { Patient } from './patient';

export type LabResultStatus = 'pending' | 'processing' | 'completed' | 'released' | 'cancelled';
export type LabCategory =
  | 'hematology'
  | 'clinical_chemistry'
  | 'urinalysis'
  | 'serology'
  | 'microbiology'
  | 'imaging'
  | 'other';

export interface LabResult {
  id: string;
  date_created: string;
  date_updated: string | null;
  patient_id: string | Patient;
  encounter_id: string | null;
  test_name: string;
  category: LabCategory;
  status: LabResultStatus;
  requested_by: string | null;
  requested_date: string;
  collected_date: string | null;
  released_date: string | null;
  result_id: string | null;
  result_collection: string | null;
  ai_interpretation: string | null;
  remarks: string | null;
  branch: string | null;
}

// -- Sub-result collections --

export interface ResultsHematology {
  id: string;
  lab_result_id: string;
  hemoglobin: number | null;
  hematocrit: number | null;
  rbc: number | null;
  wbc: number | null;
  platelet: number | null;
  remarks: string | null;
}

export interface ResultsHematologyCBC {
  id: string;
  lab_result_id: string;
  wbc: number | null;
  neutrophils: number | null;
  lymphocytes: number | null;
  monocytes: number | null;
  eosinophils: number | null;
  basophils: number | null;
  rbc: number | null;
  hemoglobin: number | null;
  hematocrit: number | null;
  mcv: number | null;
  mch: number | null;
  mchc: number | null;
  rdw: number | null;
  platelet: number | null;
  mpv: number | null;
  remarks: string | null;
}

export interface ResultsHematologyPBS {
  id: string;
  lab_result_id: string;
  rbc_morphology: string | null;
  wbc_morphology: string | null;
  platelet_morphology: string | null;
  impression: string | null;
  remarks: string | null;
}

export interface ResultsClinicalChemistry {
  id: string;
  lab_result_id: string;
  glucose: number | null;
  bun: number | null;
  creatinine: number | null;
  uric_acid: number | null;
  cholesterol: number | null;
  triglycerides: number | null;
  hdl: number | null;
  ldl: number | null;
  sgpt: number | null;
  sgot: number | null;
  alkaline_phosphatase: number | null;
  bilirubin_total: number | null;
  bilirubin_direct: number | null;
  total_protein: number | null;
  albumin: number | null;
  remarks: string | null;
}

export interface ResultsUrinalysis {
  id: string;
  lab_result_id: string;
  color: string | null;
  clarity: string | null;
  ph: number | null;
  specific_gravity: number | null;
  protein: string | null;
  glucose: string | null;
  ketones: string | null;
  blood: string | null;
  nitrite: string | null;
  leukocyte_esterase: string | null;
  wbc_micro: string | null;
  rbc_micro: string | null;
  epithelial_cells: string | null;
  bacteria: string | null;
  casts: string | null;
  crystals: string | null;
  remarks: string | null;
}

export interface ResultsSerology {
  id: string;
  lab_result_id: string;
  hbsag: string | null;
  anti_hbs: string | null;
  anti_hbc: string | null;
  anti_hav: string | null;
  anti_hcv: string | null;
  vdrl: string | null;
  rpr: string | null;
  tpha: string | null;
  remarks: string | null;
}

export interface ResultsSerologyNew {
  id: string;
  lab_result_id: string;
  test_name: string | null;
  result: string | null;
  reference_range: string | null;
  remarks: string | null;
}

export interface ResultsImmunochemistry {
  id: string;
  lab_result_id: string;
  tsh: number | null;
  ft3: number | null;
  ft4: number | null;
  t3: number | null;
  t4: number | null;
  psa: number | null;
  cea: number | null;
  afp: number | null;
  hcg: number | null;
  remarks: string | null;
}

export interface ResultsMicrobiologyKOH {
  id: string;
  lab_result_id: string;
  specimen: string | null;
  result: string | null;
  organism: string | null;
  remarks: string | null;
}

export interface ResultsParasitology {
  id: string;
  lab_result_id: string;
  specimen: string | null;
  result: string | null;
  organism: string | null;
  remarks: string | null;
}

export interface ResultsCovidAntigen {
  id: string;
  lab_result_id: string;
  result: 'positive' | 'negative' | 'invalid' | null;
  specimen_type: string | null;
  remarks: string | null;
}

export interface ResultsDrugTest {
  id: string;
  lab_result_id: string;
  amphetamine: string | null;
  methamphetamine: string | null;
  marijuana: string | null;
  cocaine: string | null;
  opiates: string | null;
  barbiturates: string | null;
  benzodiazepines: string | null;
  remarks: string | null;
}

export interface ResultsECG {
  id: string;
  lab_result_id: string;
  rate: number | null;
  rhythm: string | null;
  pr_interval: string | null;
  qrs_duration: string | null;
  qt_interval: string | null;
  axis: string | null;
  interpretation: string | null;
  remarks: string | null;
}

export interface ResultsOsXray {
  id: string;
  lab_result_id: string;
  view: string | null;
  findings: string | null;
  impression: string | null;
  remarks: string | null;
}

export interface ResultsUltrasound {
  id: string;
  lab_result_id: string;
  organ: string | null;
  findings: string | null;
  impression: string | null;
  remarks: string | null;
}

export interface ResultsPapSmear {
  id: string;
  lab_result_id: string;
  adequacy: string | null;
  general_category: string | null;
  interpretation: string | null;
  remarks: string | null;
}

export interface ResultsSpermAnalysis {
  id: string;
  lab_result_id: string;
  volume: number | null;
  color: string | null;
  viscosity: string | null;
  ph: number | null;
  count: number | null;
  motility: string | null;
  morphology: string | null;
  remarks: string | null;
}

export interface ResultsOthers {
  id: string;
  lab_result_id: string;
  test_name: string | null;
  result: string | null;
  reference_range: string | null;
  remarks: string | null;
}
