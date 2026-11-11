import { useTranslation } from 'react-i18next';
import { ClipboardList, User } from 'lucide-react';
import type { ApplicationDetail } from '../api/types';
import { formatDate, formatDateTime, personName, rupees } from '../lib/format';
import { Card, Field } from './ui';

export function ApplicantCard({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const src = app.incomeSources;
  return (
    <Card title={t('newApp.applicant')} icon={<User size={16} aria-hidden />}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field label={t('fields.relationName')} value={app.relationName} />
        <Field label={t('fields.gender')} value={t(`fields.gender${app.gender}`)} />
        <Field label={t('fields.familySize')} value={app.familySize} />
        <Field label={t('fields.occupation')} value={app.occupation} />
        <Field label={t('fields.purpose')} value={app.purpose} />
        <Field label={t('fields.mobile')} value={app.mobile} />
        <Field label={t('fields.aadhaarLast4')} value={`XXXX XXXX ${app.aadhaarLast4}`} />
        <Field label={t('fields.landAcres')} value={app.landAcres ?? '—'} />
        <Field label={t('fields.receivedOn')} value={formatDate(app.receivedAt)} />
        <div className="col-span-2 sm:col-span-3">
          <Field label={t('newApp.address')} value={`${app.address}, ${app.village}, ${app.hobli}, ${app.taluk}, ${app.district}`} />
        </div>
      </dl>
      <div className="mt-4 rounded-lg bg-canvas p-3">
        <div className="mb-2 text-xs font-medium text-muted">{t('fields.incomeSources')}</div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {(['agriculture', 'salary', 'business', 'other'] as const).map((k) => (
            <div key={k}>
              <span className="text-muted">{t(`fields.${k}`)}: </span>
              <span className="font-medium tabular-nums">{rupees(src[k])}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 border-t border-line pt-2 text-sm">
          <span>{t('fields.declaredIncome')}: <b className="tabular-nums">{rupees(app.declaredIncome)}</b></span>
          {app.verifiedIncome !== null && <span>{t('fields.verifiedIncome')}: <b className="tabular-nums">{rupees(app.verifiedIncome)}</b></span>}
        </div>
      </div>
    </Card>
  );
}

/** What each officer found and recommended, in their own words (any language). */
export function ReportsCard({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  if (!app.reports.length) return null;
  return (
    <Card title={t('reports.title')} icon={<ClipboardList size={16} aria-hidden />}>
      <ul className="space-y-3">
        {app.reports.map((r) => (
          <li key={r.id} className="rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="font-semibold text-ink">
                {t(`stages.${r.stage}`)} · {personName(r.author)} ({t(`rolesShort.${r.author.role}`)})
              </span>
              <span>{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm whitespace-pre-line">{r.notes}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {r.verifiedIncome !== null && <span className="chip bg-canvas ring-1 ring-line">{t('fields.verifiedIncome')}: {rupees(r.verifiedIncome)}</span>}
              {r.recommendation && (
                <span className={`chip ${r.recommendation === 'APPROVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  {t('reports.recommends')}: {t(`ai.decisions.${r.recommendation}`)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
