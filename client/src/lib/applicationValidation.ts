/**
 * Client-side rules for the new-application form. They mirror the server's zod
 * `createSchema` (server/src/modules/applications/service.ts) so operators see
 * problems inline instead of after a round trip.
 */

export type ApplicationForm = {
  applicantName: string;
  applicantNameLocal: string;
  relationName: string;
  gender: string;
  mobile: string;
  aadhaarLast4: string;
  address: string;
  village: string;
  hobli: string;
  taluk: string;
  district: string;
  occupation: string;
  purpose: string;
  familySize: string;
  landAcres: string;
  agriculture: string;
  salary: string;
  business: string;
  other: string;
};

export type FieldKey = keyof ApplicationForm;

/** A translation key under `validation.*` plus interpolation values. */
export type FieldError = { key: string; values?: Record<string, number> };
export type FormErrors = Partial<Record<FieldKey, FieldError>>;

export const MAX_INCOME = 100_000_000; // matches server `money` max
export const INCOME_FIELDS = ['agriculture', 'salary', 'business', 'other'] as const;

/** Max characters allowed per digit-only field (enforced while typing). */
export const DIGIT_LIMITS: Partial<Record<FieldKey, number>> = {
  mobile: 10,
  aadhaarLast4: 4,
  familySize: 2,
  agriculture: 9,
  salary: 9,
  business: 9,
  other: 9,
};

/** Strip anything that isn't a digit, then cap the length. */
export const onlyDigits = (v: string, max?: number) => {
  const d = v.replace(/\D/g, '');
  return max ? d.slice(0, max) : d;
};

/** Digits with at most one decimal point and two decimal places (land in acres). */
export const onlyDecimal = (v: string) => {
  const cleaned = v.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole.slice(0, 4);
  return `${whole.slice(0, 4)}.${rest.join('').slice(0, 2)}`;
};

const NAME_EN = /^[A-Za-z][A-Za-z .'-]*$/;
const MOBILE = /^[6-9]\d{9}$/;

function text(v: string, min: number, max: number): FieldError | undefined {
  const s = v.trim();
  if (!s) return { key: 'required' };
  if (s.length < min) return { key: 'minLength', values: { n: min } };
  if (s.length > max) return { key: 'maxLength', values: { n: max } };
  return undefined;
}

function englishName(v: string): FieldError | undefined {
  return text(v, 2, 100) ?? (NAME_EN.test(v.trim()) ? undefined : { key: 'lettersOnly' });
}

function income(v: string): FieldError | undefined {
  if (v.trim() === '') return { key: 'required' };
  if (!/^\d+$/.test(v)) return { key: 'wholeNumber' };
  if (Number(v) > MAX_INCOME) return { key: 'maxAmount', values: { n: MAX_INCOME } };
  return undefined;
}

const RULES: Record<FieldKey, (v: string) => FieldError | undefined> = {
  applicantName: englishName,
  applicantNameLocal: (v) => (v.trim().length > 100 ? { key: 'maxLength', values: { n: 100 } } : undefined),
  relationName: englishName,
  gender: (v) => (['M', 'F', 'O'].includes(v) ? undefined : { key: 'required' }),
  mobile: (v) => (!v ? { key: 'required' } : MOBILE.test(v) ? undefined : { key: 'mobile' }),
  aadhaarLast4: (v) => (!v ? { key: 'required' } : /^\d{4}$/.test(v) ? undefined : { key: 'aadhaar' }),
  address: (v) => text(v, 3, 300),
  village: (v) => text(v, 2, 100),
  hobli: (v) => text(v, 2, 100),
  taluk: (v) => text(v, 2, 100),
  district: (v) => text(v, 2, 100),
  occupation: (v) => text(v, 2, 100),
  purpose: (v) => text(v, 2, 100),
  familySize: (v) => {
    if (!v) return { key: 'required' };
    const n = Number(v);
    return /^\d+$/.test(v) && n >= 1 && n <= 30 ? undefined : { key: 'range', values: { min: 1, max: 30 } };
  },
  landAcres: (v) => {
    if (!v) return undefined; // optional
    if (!/^\d+(\.\d{1,2})?$/.test(v)) return { key: 'decimal' };
    return Number(v) <= 1000 ? undefined : { key: 'range', values: { min: 0, max: 1000 } };
  },
  agriculture: income,
  salary: income,
  business: income,
  other: income,
};

export const validateField = (k: FieldKey, v: string) => RULES[k](v);

export function validateForm(form: ApplicationForm): FormErrors {
  const errors: FormErrors = {};
  for (const k of Object.keys(RULES) as FieldKey[]) {
    const e = validateField(k, form[k]);
    if (e) errors[k] = e;
  }
  return errors;
}
