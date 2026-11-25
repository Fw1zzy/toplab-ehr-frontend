import { assertNotPatientRole, bearerToken, cmsRequest, getRequestContext, InterclinicError } from '@/lib/interclinicServer';
import type { QuestionnaireSchema, QuestionnaireValue, QuestionnaireResponse } from '@/types/questionnaire';
import { validateQuestionnaireValues } from '@/lib/questionnaireModel';

const groupLabels: Record<string, string> = {
  physical_examination: 'Physical Examination',
  medical_history: 'Medical History',
  family_history: 'Family History',
  personal_and_social_history: 'Personal & Social History',
  ob_gyne_history: 'OB-Gyne History',
};

interface EhrField {
  field: string;
  type: string;
  schema: { max_length?: number | null; is_nullable?: boolean } | null;
  meta: {
    hidden?: boolean; readonly?: boolean; required?: boolean; group?: string; sort?: number;
    interface?: string; note?: string;
    options?: { placeholder?: string; choices?: Array<{ text: string; value: string }> } | null;
  } | null;
}

function label(value: string) {
  return value.replace(/^\$t:/, '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function questionnaireContext(request: Request) {
  const token = bearerToken(request);
  const context = await getRequestContext(token);
  const service = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
  if (!service) throw new InterclinicError('EHR questionnaire metadata access is not configured.', 503);
  await assertNotPatientRole(service, context.user.id);
  return { token, service, ...context };
}

export async function questionnaireSchema(service: string): Promise<QuestionnaireSchema> {
  const fields = await cmsRequest<EhrField[]>(service, '/fields/questionnaire_response');
  const visible = fields.filter((field) => field.schema && !field.meta?.hidden &&
    (Object.hasOwn(groupLabels, field.meta?.group ?? '') || ['status', 'submitted_at'].includes(field.field)));
  return {
    groups: [{ id: 'general', label: 'General Information' }, ...Object.entries(groupLabels).map(([id, name]) => ({ id, label: name }))],
    fields: visible.sort((a, b) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0)).map((field) => ({
      name: field.field,
      label: field.field === 'BMI' ? 'BMI' : field.field === 'od' ? 'OD (Right Eye)' : field.field === 'os' ? 'OS (Left Eye)' : label(field.field),
      group: field.meta?.group ?? 'general', type: field.type, interface: field.meta?.interface ?? null,
      required: field.field !== 'submitted_at' && (!!field.meta?.required || field.schema?.is_nullable === false),
      readonly: field.field === 'submitted_at' || !!field.meta?.readonly,
      maxLength: field.schema?.max_length ?? null,
      placeholder: field.meta?.options?.placeholder?.trim() ?? '',
      choices: (field.meta?.options?.choices ?? []).map((choice) => ({ label: label(choice.text.trim()), value: choice.value })),
    })),
  };
}

export function questionnaireScope(branchId: string) {
  return { patient: { custodian_branch: { _eq: branchId } } };
}

export async function assertQuestionnairePatient(token: string, branchId: string, patientId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) throw new InterclinicError('Choose a valid patient.', 400);
  const query = new URLSearchParams({ fields: 'id', limit: '1', filter: JSON.stringify({ id: { _eq: patientId }, custodian_branch: { _eq: branchId } }) });
  const patients = await cmsRequest<Array<{ id: string }>>(token, `/items/patient?${query}`);
  if (!patients.length) throw new InterclinicError('Questionnaire responses can only be managed for patients owned by your branch.', 403);
}

export function questionnaireAnswers(input: unknown, schema: QuestionnaireSchema, creating: boolean) {
  try { return validateQuestionnaireValues(input, schema.fields, creating); }
  catch (error) { throw new InterclinicError(error instanceof Error ? error.message : 'Invalid questionnaire answers.', 400); }
}

export function responseFields(schema: QuestionnaireSchema) {
  return [...new Set(['id', 'patient.id', 'patient.first_name', 'patient.last_name', 'status', 'is_finalized', 'date_created', 'date_updated', 'submitted_at', ...schema.fields.map((field) => field.name)])].join(',');
}

export function mapQuestionnaire(row: Record<string, unknown>, schema?: QuestionnaireSchema): QuestionnaireResponse {
  return {
    id: String(row.id), patient: row.patient as QuestionnaireResponse['patient'],
    status: row.status as QuestionnaireResponse['status'], is_finalized: row.is_finalized === true,
    date_created: row.date_created as string | null, date_updated: row.date_updated as string | null,
    submitted_at: typeof row.submitted_at === 'string'
      ? (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(row.submitted_at) ? row.submitted_at : `${row.submitted_at.replace(' ', 'T')}Z`)
      : null,
    ...(schema ? { values: Object.fromEntries(schema.fields.map((field) => [field.name, row[field.name] as QuestionnaireValue ?? null])) } : {}),
  };
}

export function questionnaireError(cause: unknown) {
  const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to complete the questionnaire request.', 500);
  return { error: error.message, status: error.status };
}
