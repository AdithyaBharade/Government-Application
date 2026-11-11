import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Hourglass, RotateCcw, Send, XCircle } from 'lucide-react';
import type { ApplicationDetail } from '../../api/types';
import { formatDate, rupees } from '../../lib/format';
import { useStageAction } from './useStageAction';

/** Operator: a returned file comes back to the front desk to collect documents from the citizen. */
export function OperatorPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const action = useStageAction(app.id);
  const blocked = app.missingDocuments.length > 0;
  return (
    <section className="card space-y-3 border-amber-300 bg-amber-50/50 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-amber-900">
        <RotateCcw size={18} aria-hidden /> {t('operator.title')}
      </h2>
      {app.lastReturnReason && (
        <div>
          <div className="label">{t('operator.reason')}</div>
          <p className="rounded-lg bg-white px-3 py-2 text-sm">{app.lastReturnReason}</p>
        </div>
      )}
      <p className="text-sm">{t('operator.instructions')}</p>
      {action.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{action.error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={blocked || action.busy} onClick={() => action.submit({ action: 'RESUBMIT' }).catch(() => undefined)}>
        <Send size={16} aria-hidden /> {t('operator.resubmit')}
      </button>
    </section>
  );
}

/** Someone else's turn: read-only, says clearly who has the file. */
export function WaitingPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  if (!app.owner) return null;
  const role = t(`roles.${app.owner}`);
  return (
    <section className="card flex items-start gap-3 p-4">
      <Hourglass className="mt-0.5 shrink-0 text-muted" size={20} aria-hidden />
      <div>
        <h2 className="font-semibold">{t('waiting.title', { role })}</h2>
        <p className="text-sm text-muted">{t('waiting.body', { role })}</p>
      </div>
    </section>
  );
}

export function ClosedPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const approved = app.stage === 'APPROVED';
  return (
    <section className={`card space-y-2 p-4 ${approved ? 'border-emerald-300 bg-emerald-50/50' : 'border-red-300 bg-red-50/50'}`}>
      <h2 className={`flex items-center gap-2 font-semibold ${approved ? 'text-emerald-800' : 'text-red-800'}`}>
        {approved ? <CheckCircle2 size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}
        {t(`closed.${app.stage as 'APPROVED' | 'REJECTED'}`)}
        <span className="text-sm font-normal text-muted">· {formatDate(app.decidedAt)}</span>
      </h2>
      {app.decisionReason && <p className="text-sm whitespace-pre-line">{app.decisionReason}</p>}
      {approved && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm">
          <span>{t('closed.certNo')}: <b>{app.certificateNo}</b></span>
          <span>{t('fields.verifiedIncome')}: <b>{rupees(app.verifiedIncome)}</b></span>
          <Link to={`/applications/${app.id}/certificate`} className="btn-secondary min-h-9 px-3">{t('closed.view')}</Link>
        </div>
      )}
    </section>
  );
}
