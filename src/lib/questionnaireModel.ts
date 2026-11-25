import type { QuestionnaireField, QuestionnaireValue } from '@/types/questionnaire';

export function validateQuestionnaireValues(input: unknown, fields: QuestionnaireField[], creating: boolean) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Questionnaire answers must be an object.');
  const allowed = new Map(fields.filter((field) => !field.readonly).map((field) => [field.name, field]));
  const values: Record<string, QuestionnaireValue> = {};
  for (const [name, raw] of Object.entries(input)) {
    const field = allowed.get(name);
    if (!field) throw new Error(`The field "${name}" cannot be edited.`);
    if (raw === null || raw === '') {
      if (field.required) throw new Error(`${field.label} is required.`);
      values[name] = null;
      continue;
    }
    if (field.interface === 'select-multiple-checkbox') {
      if (!Array.isArray(raw) || raw.some((value) => typeof value !== 'string' || !field.choices.some((choice) => choice.value === value))) {
        throw new Error(`Select valid choices for ${field.label}.`);
      }
      values[name] = [...new Set(raw as string[])];
    } else if (['integer', 'float', 'decimal', 'bigInteger'].includes(field.type)) {
      if (typeof raw !== 'string' && typeof raw !== 'number') throw new Error(`${field.label} must be a number.`);
      const numeric = typeof raw === 'string' && !raw.trim() ? NaN : Number(raw);
      if (!Number.isFinite(numeric) || (['integer', 'bigInteger'].includes(field.type) && !Number.isSafeInteger(numeric))) throw new Error(`Enter a valid number for ${field.label}.`);
      values[name] = numeric;
    } else if (field.type === 'boolean') {
      if (typeof raw !== 'boolean') throw new Error(`${field.label} must be true or false.`);
      values[name] = raw;
    } else {
      if (typeof raw !== 'string') throw new Error(`${field.label} must be text.`);
      if (raw.length > (field.maxLength ?? 10000)) throw new Error(`${field.label} exceeds the allowed length.`);
      if (field.choices.length && !field.choices.some((choice) => choice.value === raw)) throw new Error(`Select a valid value for ${field.label}.`);
      if (['date', 'dateTime', 'timestamp'].includes(field.type) && !Number.isFinite(Date.parse(raw))) throw new Error(`${field.label} must be a valid date.`);
      values[name] = raw;
    }
  }
  if (creating) {
    for (const field of allowed.values()) {
      const value = values[field.name];
      if (field.required && (value == null || value === '' || (Array.isArray(value) && !value.length))) throw new Error(`${field.label} is required.`);
    }
  }
  return values;
}
