import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FilePlus2, Paperclip } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import type { DocType } from '../api/types';
import { rupees } from '../lib/format';
import { Spinner } from '../components/ui';

const DOC_SLOTS: DocType[] = ['AADHAAR', 'RATION_CARD', 'SELF_DECLARATION', 'SALARY_CERTIFICATE', 'RTC', 'OTHER'];

const EMPTY = {
  applicantName: '',
  applicantNameLocal: '',
  relationName: '',
  gender: 'M',
  mobile: '',
  aadhaarLast4: '',
  address: '',
  village: '',
  hobli: 'Kundana',
  taluk: 'Devanahalli',
  district: 'Bengaluru Rural',
  occupation: '',
  purpose: '',
  familySize: '4',
  landAcres: '',
  agriculture: '0',
  salary: '0',
  business: '0',
  other: '0',
};

type FormState = typeof EMPTY;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="card p-4">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Front-desk registration: what the operator types from the paper form, plus scanned documents. */
export function NewApplicationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [files, setFiles] = useState<Partial<Record<DocType, File>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const num = (v: string) => Number(v.replace(/\D/g, '') || 0);
  const total = useMemo(() => num(form.agriculture) + num(form.salary) + num(form.business) + num(form.other), [form]);

  const input = (k: keyof FormState, opts: { type?: string; inputMode?: 'numeric' | 'tel'; required?: boolean; label?: string } = {}) => (
    <label className="block">
      <span className="label">{opts.label ?? t(`fields.${k}`)}</span>
      <input className="input" type={opts.type ?? 'text'} inputMode={opts.inputMode} value={form[k]} onChange={set(k)} required={opts.required ?? true} />
    </label>
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ id: string; appNo: string }>('/applications', {
        applicantName: form.applicantName,
        applicantNameLocal: form.applicantNameLocal,
        relationName: form.relationName,
        gender: form.gender,
        mobile: form.mobile,
        aadhaarLast4: form.aadhaarLast4,
        address: form.address,
        village: form.village,
        hobli: form.hobli,
        taluk: form.taluk,
        district: form.district,
        occupation: form.occupation,
        purpose: form.purpose,
        familySize: num(form.familySize),
        landAcres: form.landAcres ? Number(form.landAcres) : undefined,
        incomeSources: { agriculture: num(form.agriculture), salary: num(form.salary), business: num(form.business), other: num(form.other) },
      });
      // Upload documents one at a time – friendlier to weak connections than one big request
      for (const [type, file] of Object.entries(files) as [DocType, File][]) {
        const fd = new FormData();
        fd.append('type', type);
        fd.append('file', file);
        await api.post(`/applications/${data.id}/documents`, fd);
      }
      qc.invalidateQueries();
      navigate(`/applications/${data.id}`, { replace: true });
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg === 'NETWORK' ? t('common.network') : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <FilePlus2 size={22} className="text-brand-600" aria-hidden /> {t('newApp.title')}
      </h1>

      <Section title={t('newApp.applicant')}>
        {input('applicantName')}
        {input('applicantNameLocal', { required: false })}
        {input('relationName')}
        <label className="block">
          <span className="label">{t('fields.gender')}</span>
          <select className="input" value={form.gender} onChange={set('gender')}>
            <option value="M">{t('fields.genderM')}</option>
            <option value="F">{t('fields.genderF')}</option>
            <option value="O">{t('fields.genderO')}</option>
          </select>
        </label>
        {input('mobile', { type: 'tel', inputMode: 'tel' })}
        {input('aadhaarLast4', { inputMode: 'numeric' })}
        {input('occupation')}
        {input('purpose')}
        {input('familySize', { inputMode: 'numeric' })}
      </Section>

      <Section title={t('newApp.address')}>
        {input('address')}
        {input('village')}
        {input('hobli')}
        {input('taluk')}
        {input('district')}
      </Section>

      <Section title={t('newApp.income')}>
        {input('agriculture', { inputMode: 'numeric', label: `${t('fields.agriculture')} (₹)` })}
        {input('salary', { inputMode: 'numeric', label: `${t('fields.salary')} (₹)` })}
        {input('business', { inputMode: 'numeric', label: `${t('fields.business')} (₹)` })}
        {input('other', { inputMode: 'numeric', label: `${t('fields.other')} (₹)` })}
        {input('landAcres', { inputMode: 'numeric', required: false })}
        <div className="flex items-end">
          <p className="w-full rounded-lg bg-brand-50 px-3 py-2.5 font-semibold text-brand-700">
            {t('fields.total')}: {rupees(total)}
          </p>
        </div>
      </Section>

      <fieldset className="card p-4">
        <h2 className="mb-1 font-semibold">{t('newApp.documents')}</h2>
        <p className="mb-3 text-sm text-muted">{t('newApp.docsHint')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOC_SLOTS.map((type) => (
            <label key={type} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2 hover:border-brand-500">
              <Paperclip size={16} className="shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t(`docs.types.${type}`)}</span>
                <span className="block truncate text-xs text-muted">{files[type]?.name ?? t('docs.hint')}</span>
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setFiles((prev) => ({ ...prev, [type]: f }));
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Spinner label={t('newApp.submitting')} /> : t('newApp.submit')}
      </button>
    </form>
  );
}
