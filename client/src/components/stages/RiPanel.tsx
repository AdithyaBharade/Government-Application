import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, RotateCcw, Send } from 'lucide-react';
import { useAi } from '../../api/hooks';
import type { AiRun, ApplicationDetail, FieldChecklist, ReportDraft } from '../../api/types';
import { currentLang } from '../../i18n';
import { rupees } from '../../lib/format';
import { AiBox, feedbackFor } from '../AiBox';
import { ConfirmDialog, ReasonField } from '../ConfirmDialog';
import { VoiceButton } from '../VoiceButton';
import { useStageAction } from './useStageAction';

/** Step 2 – Revenue Inspector verifies income in the village. */
export function RiPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const checklistAi = useAi<FieldChecklist>(app.id, 'field-checklist');
  const draftAi = useAi<ReportDraft>(app.id, 'report-draft');
  const checklistRun = app.latestAi.FIELD_CHECKLIST as AiRun<FieldChecklist> | undefined;
  const draftRun = app.latestAi.REPORT_DRAFT as AiRun<ReportDraft> | undefined;
  const action = useStageAction(app.id);

  const [notes, setNotes] = useState('');
  const [report, setReport] = useState('');
  const [used, setUsed] = useState<string | null>(null);
  const [income, setIncome] = useState<string>('');
  const [rec, setRec] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');

  const cl = checklistRun?.output;
  const draft = draftRun?.output;
  const canForward = report.trim().length >= 10 && income !== '';

  return (
    <section className="card space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <MapPin size={18} className="text-brand-600" aria-hidden /> {t('ri.title')}
      </h2>

      <AiBox
        title={t('ai.checklist.title')}
        desc={t('ai.checklist.desc')}
        run={checklistRun}
        pending={checklistAi.isPending}
        error={checklistAi.error}
        onRun={() => checklistAi.mutate({ lang: currentLang() })}
      >
        {cl && (
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted uppercase">{t('ai.checklist.focus')}</h4>
              <ul className="space-y-2">
                {cl.focusPoints.map((f, i) => (
                  <li key={i}>
                    <div className="font-medium">• {f.point}</div>
                    <div className="text-xs text-muted">{f.why}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted uppercase">{t('ai.checklist.ask')}</h4>
              <ul className="list-inside list-disc space-y-1">{cl.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted uppercase">{t('ai.checklist.see')}</h4>
              <ul className="list-inside list-disc space-y-1">{cl.thingsToSee.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          </div>
        )}
      </AiBox>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="label mb-0">{t('ri.notes')}</span>
          <VoiceButton onText={(text) => setNotes((n) => (n ? `${n} ${text}` : text))} />
        </div>
        <textarea className="input min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ri.notesPh')} />
      </div>

      <AiBox
        title={t('ai.draft.title')}
        desc={t('ai.draft.desc')}
        run={draftRun}
        pending={draftAi.isPending}
        error={draftAi.error}
        disabled={notes.trim().length < 15}
        onRun={() => draftAi.mutate({ lang: currentLang(), notes })}
      >
        {draft && (
          <div className="space-y-2 text-sm">
            <p className="rounded-lg bg-ai-50 p-3 whitespace-pre-line">{draft.report}</p>
            <p>
              <span className="text-muted">{t('ai.draft.breakdown')}:</span> {draft.incomeBreakdown}
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.verifiedAnnualIncome != null && <span className="chip bg-canvas ring-1 ring-line">{t('fields.verifiedIncome')}: {rupees(draft.verifiedAnnualIncome)}</span>}
              <span className="chip bg-canvas ring-1 ring-line">{t('reports.recommends')}: {t(`ai.decisions.${draft.recommendation}`)}</span>
            </div>
            {draft.missingInfo.length > 0 && (
              <p className="text-amber-900">
                {t('ai.draft.missing')}: {draft.missingInfo.join('; ')}
              </p>
            )}
            <button
              className="btn-ai min-h-9 px-3"
              onClick={() => {
                setReport(draft.report);
                setUsed(draft.report);
                if (draft.verifiedAnnualIncome != null) setIncome(String(draft.verifiedAnnualIncome));
                if (draft.recommendation !== 'UNCLEAR') setRec(draft.recommendation);
              }}
            >
              {used === draft.report ? t('ai.used') : t('ai.use')}
            </button>
          </div>
        )}
      </AiBox>

      <label className="block">
        <span className="label">{t('ri.report')}</span>
        <textarea className="input min-h-32" value={report} onChange={(e) => setReport(e.target.value)} placeholder={t('ri.reportPh')} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t('ri.verifiedIncome')}</span>
          <input className="input tabular-nums" inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value.replace(/\D/g, ''))} placeholder={String(app.declaredIncome)} />
        </label>
        <fieldset>
          <legend className="label">{t('ri.recommendation')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['APPROVE', 'REJECT'] as const).map((r) => (
              <label key={r} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-medium ${rec === r ? (r === 'APPROVE' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-red-600 bg-red-50 text-red-800') : 'border-line'}`}>
                <input type="radio" className="sr-only" name="rec" checked={rec === r} onChange={() => setRec(r)} />
                {r === 'APPROVE' ? t('ri.recApprove') : t('ri.recReject')}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {action.error && !returning && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{action.error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="btn-primary flex-1"
          disabled={!canForward || action.busy}
          onClick={() =>
            action.submit({
              action: 'FORWARD',
              report: { notes: report, verifiedIncome: Number(income), recommendation: rec },
              ai: feedbackFor(draftRun, used, report),
            }).catch(() => undefined)
          }
        >
          <Send size={16} aria-hidden /> {t('ri.forward')}
        </button>
        <button className="btn-warn" onClick={() => { action.reset(); setReturning(true); }}>
          <RotateCcw size={16} aria-hidden /> {t('ri.returnToVa')}
        </button>
      </div>

      <ConfirmDialog
        open={returning}
        title={t('ri.returnToVa')}
        confirmLabel={t('action.confirm')}
        tone="warn"
        busy={action.busy}
        disabled={reason.trim().length < 10}
        error={action.error}
        onCancel={() => setReturning(false)}
        onConfirm={() => action.submit({ action: 'RETURN', reason }).catch(() => undefined)}
      >
        <ReasonField value={reason} onChange={setReason} />
      </ConfirmDialog>
    </section>
  );
}
