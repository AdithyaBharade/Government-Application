import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, RotateCcw, Send } from 'lucide-react';
import { useAi } from '../../api/hooks';
import type { AiRun, ApplicationDetail, DocumentCheck } from '../../api/types';
import { currentLang } from '../../i18n';
import { rupees } from '../../lib/format';
import { AiBox, CheckStatusChip, feedbackFor } from '../AiBox';
import { FlagChips } from '../badges';
import { ConfirmDialog, ReasonField } from '../ConfirmDialog';
import { useStageAction } from './useStageAction';

const CHECKS = ['identity', 'rationCard', 'selfDeclaration', 'incomeProof'] as const;

/** Step 1 – Village Administrative Officer verifies documents against the form. */
export function VaPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const ai = useAi<DocumentCheck>(app.id, 'document-check');
  const run = app.latestAi.DOCUMENT_CHECK as AiRun<DocumentCheck> | undefined;
  const action = useStageAction(app.id);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState('');
  const [used, setUsed] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [usedReason, setUsedReason] = useState<string | null>(null);

  const out = run?.output;
  const canForward = remarks.trim().length >= 10;

  return (
    <section className="card space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <ClipboardCheck size={18} className="text-brand-600" aria-hidden /> {t('va.title')}
      </h2>

      <AiBox
        title={t('ai.docCheck.title')}
        desc={t('ai.docCheck.desc')}
        run={run}
        pending={ai.isPending}
        error={ai.error}
        disabled={app.documents.length === 0}
        onRun={() => ai.mutate({ lang: currentLang() })}
      >
        {out && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <FlagChips flags={out.flags} />
              <span className={`chip ${out.suggestedAction === 'RETURN' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>
                {out.suggestedAction === 'RETURN' ? t('ai.docCheck.suggestsReturn') : t('ai.docCheck.suggestsForward')}
              </span>
            </div>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {out.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <CheckStatusChip status={c.status} />
                  <div className="min-w-0">
                    <div className="font-medium">{c.item}</div>
                    <div className="text-muted">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            {out.estimatedAnnualIncome != null && (
              <p className="text-sm">
                {t('ai.docCheck.income')}: <b>{rupees(out.estimatedAnnualIncome)}</b> · {t('fields.declaredIncome')}: <b>{rupees(app.declaredIncome)}</b>
              </p>
            )}
            <div className="rounded-lg bg-ai-50 p-3">
              <p className="text-sm whitespace-pre-line">{out.suggestedRemarks}</p>
              <button
                className="btn-ai mt-2 min-h-9 px-3"
                onClick={() => {
                  setRemarks(out.suggestedRemarks);
                  setUsed(out.suggestedRemarks);
                }}
              >
                {used === out.suggestedRemarks ? t('ai.used') : t('ai.use')}
              </button>
            </div>
          </div>
        )}
      </AiBox>

      <fieldset>
        <legend className="label">{t('va.checklistTitle')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHECKS.map((c) => (
            <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="checkbox" className="size-5 accent-brand-700" checked={Boolean(checks[c])} onChange={(e) => setChecks({ ...checks, [c]: e.target.checked })} />
              {t(`va.checklist.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">{t('va.remarks')}</span>
        <textarea className="input min-h-28" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t('va.remarksPh')} />
      </label>

      {action.error && !returning && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{action.error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="btn-primary flex-1"
          disabled={!canForward || action.busy}
          onClick={() =>
            action.submit({
              action: 'FORWARD',
              report: { notes: remarks, checklist: checks, recommendation: 'APPROVE' },
              ai: feedbackFor(run, used, remarks),
            }).catch(() => undefined)
          }
        >
          <Send size={16} aria-hidden /> {t('va.forward')}
        </button>
        <button
          className="btn-warn"
          onClick={() => {
            if (!reason && out?.suggestedAction === 'RETURN') {
              setReason(out.suggestedRemarks);
              setUsedReason(out.suggestedRemarks);
            }
            action.reset();
            setReturning(true);
          }}
        >
          <RotateCcw size={16} aria-hidden /> {t('va.returnToApplicant')}
        </button>
      </div>

      <ConfirmDialog
        open={returning}
        title={t('va.returnToApplicant')}
        confirmLabel={t('action.confirm')}
        tone="warn"
        busy={action.busy}
        disabled={reason.trim().length < 10}
        error={action.error}
        onCancel={() => setReturning(false)}
        onConfirm={() => action.submit({ action: 'RETURN', reason, ai: feedbackFor(run, usedReason, reason) }).catch(() => undefined)}
      >
        <ReasonField value={reason} onChange={setReason} />
      </ConfirmDialog>
    </section>
  );
}
