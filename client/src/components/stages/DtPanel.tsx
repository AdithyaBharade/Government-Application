import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Gavel, RotateCcw, XCircle } from 'lucide-react';
import { useAi } from '../../api/hooks';
import type { AiRun, ApplicationDetail, CaseBrief, Stage } from '../../api/types';
import { currentLang } from '../../i18n';
import { rupees } from '../../lib/format';
import { AiBox, feedbackFor } from '../AiBox';
import { ConfirmDialog } from '../ConfirmDialog';
import { useStageAction } from './useStageAction';

type Decision = 'APPROVE' | 'REJECT' | 'RETURN';

const DECISION_STYLE: Record<Decision, { on: string; icon: typeof CheckCircle2 }> = {
  APPROVE: { on: 'border-emerald-600 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  REJECT: { on: 'border-red-600 bg-red-50 text-red-800', icon: XCircle },
  RETURN: { on: 'border-amber-500 bg-amber-50 text-amber-900', icon: RotateCcw },
};

/** Step 3 – Deputy Tahsildar decides. AI prepares a brief; the officer chooses and signs off. */
export function DtPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const ai = useAi<CaseBrief>(app.id, 'case-brief');
  const run = app.latestAi.CASE_BRIEF as AiRun<CaseBrief> | undefined;
  const action = useStageAction(app.id);

  const riIncome = [...app.reports].reverse().find((r) => r.stage === 'RI_VERIFICATION')?.verifiedIncome;
  const [decision, setDecision] = useState<Decision | null>(null);
  const [target, setTarget] = useState<Stage>('RI_VERIFICATION');
  const [reason, setReason] = useState('');
  const [used, setUsed] = useState<string | null>(null);
  const [income, setIncome] = useState(String(riIncome ?? app.verifiedIncome ?? app.declaredIncome));
  const [confirming, setConfirming] = useState(false);

  const brief = run?.output;
  const ready = decision !== null && reason.trim().length >= 10 && (decision !== 'APPROVE' || income !== '');

  return (
    <section className="card space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Gavel size={18} className="text-brand-600" aria-hidden /> {t('dt.title')}
      </h2>

      <AiBox title={t('ai.brief.title')} desc={t('ai.brief.desc')} run={run} pending={ai.isPending} error={ai.error} onRun={() => ai.mutate({ lang: currentLang() })}>
        {brief && (
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase">{t('ai.brief.summary')}</h4>
              <p className="mt-1 whitespace-pre-line">{brief.summary}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase">{t('ai.brief.comparison')}</h4>
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {brief.incomeComparison.map((row, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="py-1.5 pr-3">{row.source}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{rupees(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {brief.risks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase">{t('ai.brief.risks')}</h4>
                <ul className="mt-1 list-inside list-disc space-y-0.5">{brief.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            <div className="rounded-lg bg-ai-50 p-3">
              <p className="font-semibold text-ai-700">
                {t('ai.brief.suggests')}: {t(`ai.decisions.${brief.suggestedDecision}`)}{' '}
                <span className="font-normal text-muted">({t(`ai.brief.confidence.${brief.confidence}`)})</span>
              </p>
              <p className="mt-1">{brief.rationale}</p>
              <h4 className="mt-3 text-xs font-semibold text-muted uppercase">{t('ai.brief.draft')}</h4>
              <p className="mt-1 whitespace-pre-line">{brief.draftReason}</p>
              <button
                className="btn-ai mt-2 min-h-9 px-3"
                onClick={() => {
                  setReason(brief.draftReason);
                  setUsed(brief.draftReason);
                  if (brief.incomeForCertificate != null) setIncome(String(brief.incomeForCertificate));
                }}
              >
                {used === brief.draftReason ? t('ai.used') : t('ai.use')}
              </button>
            </div>
          </div>
        )}
      </AiBox>

      {/* The decision itself is never pre-selected – the officer must choose. */}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('dt.title')}>
        {(['APPROVE', 'REJECT', 'RETURN'] as const).map((d) => {
          const { on, icon: Icon } = DECISION_STYLE[d];
          return (
            <button
              key={d}
              role="radio"
              aria-checked={decision === d}
              onClick={() => setDecision(d)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 text-sm font-semibold ${decision === d ? on : 'border-line text-muted hover:border-brand-200'}`}
            >
              <Icon size={20} aria-hidden />
              {t(`dt.${d === 'APPROVE' ? 'approve' : d === 'REJECT' ? 'reject' : 'return'}`)}
            </button>
          );
        })}
      </div>

      {decision === 'RETURN' && (
        <label className="block">
          <span className="label">{t('dt.returnTo')}</span>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value as Stage)}>
            <option value="RI_VERIFICATION">{t('roles.RI')}</option>
            <option value="VA_VERIFICATION">{t('roles.VA')}</option>
          </select>
        </label>
      )}

      {decision === 'APPROVE' && (
        <label className="block">
          <span className="label">{t('dt.certificateIncome')}</span>
          <input className="input tabular-nums" inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value.replace(/\D/g, ''))} />
        </label>
      )}

      <label className="block">
        <span className="label">{t('dt.reason')}</span>
        <textarea className="input min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('dt.reasonPh')} />
      </label>

      <button className="btn-primary w-full" disabled={!ready} onClick={() => { action.reset(); setConfirming(true); }}>
        <Gavel size={16} aria-hidden /> {t('dt.confirm')}
      </button>

      <ConfirmDialog
        open={confirming && decision !== null}
        title={decision ? `${t('dt.confirm')}: ${t(`ai.decisions.${decision}`)}` : ''}
        confirmLabel={t('action.confirm')}
        tone={decision === 'REJECT' ? 'danger' : decision === 'RETURN' ? 'warn' : 'primary'}
        busy={action.busy}
        error={action.error}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          decision &&
          action.submit({
            action: decision,
            target: decision === 'RETURN' ? target : undefined,
            reason,
            certificateIncome: decision === 'APPROVE' ? Number(income) : undefined,
            ai: feedbackFor(run, used, reason),
          }).catch(() => undefined)
        }
      >
        <p className="text-sm text-muted">{t('dt.confirmBody')}</p>
        <p className="rounded-lg bg-canvas px-3 py-2 text-sm whitespace-pre-line">{reason}</p>
        {decision === 'APPROVE' && <p className="text-sm">{t('dt.certificateIncome')}: <b>{rupees(Number(income))}</b></p>}
      </ConfirmDialog>
    </section>
  );
}
