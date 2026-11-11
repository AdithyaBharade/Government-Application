import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FilePlus2, Paperclip } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, errorMessage } from '../api/client';
import type { DocType } from '../api/types';
import { rupees } from '../lib/format';
import { Spinner } from '../components/common';

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

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
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
  const genders = [
    { value: 'M', label: t('fields.genderM') },
    { value: 'F', label: t('fields.genderF') },
    { value: 'O', label: t('fields.genderO') },
  ];

  const field = (k: keyof FormState, opts: { type?: string; inputMode?: 'numeric' | 'tel'; required?: boolean; label?: string } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`f-${k}`}>{opts.label ?? t(`fields.${k}`)}</Label>
      <Input id={`f-${k}`} type={opts.type ?? 'text'} inputMode={opts.inputMode} value={form[k]} onChange={set(k)} required={opts.required ?? true} />
    </div>
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
      toast.success(t('newApp.success', { appNo: data.appNo }));
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
        <FilePlus2 className="size-[22px] text-brand-600" aria-hidden /> {t('newApp.title')}
      </h1>

      <Section title={t('newApp.applicant')}>
        {field('applicantName')}
        {field('applicantNameLocal', { required: false })}
        {field('relationName')}
        <div className="space-y-1.5">
          <Label>{t('fields.gender')}</Label>
          <Select items={genders} value={form.gender} onValueChange={(v) => v && setForm({ ...form, gender: String(v) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genders.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {field('mobile', { type: 'tel', inputMode: 'tel' })}
        {field('aadhaarLast4', { inputMode: 'numeric' })}
        {field('occupation')}
        {field('purpose')}
        {field('familySize', { inputMode: 'numeric' })}
      </Section>

      <Section title={t('newApp.address')}>
        {field('address')}
        {field('village')}
        {field('hobli')}
        {field('taluk')}
        {field('district')}
      </Section>

      <Section title={t('newApp.income')}>
        {field('agriculture', { inputMode: 'numeric', label: `${t('fields.agriculture')} (₹)` })}
        {field('salary', { inputMode: 'numeric', label: `${t('fields.salary')} (₹)` })}
        {field('business', { inputMode: 'numeric', label: `${t('fields.business')} (₹)` })}
        {field('other', { inputMode: 'numeric', label: `${t('fields.other')} (₹)` })}
        {field('landAcres', { inputMode: 'numeric', required: false })}
        <div className="flex items-end">
          <p className="w-full rounded-lg bg-brand-50 px-3 py-2.5 font-semibold text-brand-700">
            {t('fields.total')}: {rupees(total)}
          </p>
        </div>
      </Section>

      <Section title={t('newApp.documents')} description={t('newApp.docsHint')}>
        {DOC_SLOTS.map((type) => (
          <label key={type} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2 hover:border-brand-500 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t(`docs.types.${type}`)}</span>
              <span className="block truncate text-xs text-muted-foreground">{files[type]?.name ?? t('docs.hint')}</span>
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
      </Section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Spinner label={t('newApp.submitting')} /> : t('newApp.submit')}
      </Button>
    </form>
  );
}
