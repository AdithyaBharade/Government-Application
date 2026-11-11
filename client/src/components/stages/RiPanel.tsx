import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, RotateCcw, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAi } from '../../api/hooks';
import type { AiRun, ApplicationDetail, FieldChecklist, ReportDraft } from '../../api/types';
import { currentLang } from '../../i18n';
import { rupees } from '../../lib/format';
import { AiBox, feedbackFor, UseSuggestionButton } from '../AiBox';
import { Panel } from '../common';
import { ConfirmDialog, ReasonField } from '../ConfirmDialog';
import { VoiceButton } from '../VoiceButton';
import { ChoiceGroup } from './ChoiceGroup';
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
  const [income, setIncome] = useState('');
  const [rec, setRec] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');

  const cl = checklistRun?.output;
  const draft = draftRun?.output;
  const canForward = report.trim().length >= 10 && income !== '';

  return (
    <Panel title={t('ri.title')} icon={<MapPin className="size-[18px] text-brand-600" aria-hidden />} contentClassName="space-y-4">
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
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{t('ai.checklist.focus')}</h4>
              <ul className="space-y-2">
                {cl.focusPoints.map((f, i) => (
                  <li key={i}>
                    <div className="font-medium">• {f.point}</div>
                    <div className="text-xs text-muted-foreground">{f.why}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{t('ai.checklist.ask')}</h4>
              <ul className="list-inside list-disc space-y-1">{cl.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{t('ai.checklist.see')}</h4>
              <ul className="list-inside list-disc space-y-1">{cl.thingsToSee.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          </div>
        )}
      </AiBox>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="ri-notes">{t('ri.notes')}</Label>
          <VoiceButton onText={(text) => setNotes((n) => (n ? `${n} ${text}` : text))} />
        </div>
        <Textarea id="ri-notes" className="min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ri.notesPh')} />
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
              <span className="text-muted-foreground">{t('ai.draft.breakdown')}:</span> {draft.incomeBreakdown}
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.verifiedAnnualIncome != null && <Badge variant="outline">{t('fields.verifiedIncome')}: {rupees(draft.verifiedAnnualIncome)}</Badge>}
              <Badge variant="outline">{t('reports.recommends')}: {t(`ai.decisions.${draft.recommendation}`)}</Badge>
            </div>
            {draft.missingInfo.length > 0 && (
              <p className="text-amber-900">
                {t('ai.draft.missing')}: {draft.missingInfo.join('; ')}
              </p>
            )}
            <UseSuggestionButton
              used={used === draft.report}
              onUse={() => {
                setReport(draft.report);
                setUsed(draft.report);
                if (draft.verifiedAnnualIncome != null) setIncome(String(draft.verifiedAnnualIncome));
                if (draft.recommendation !== 'UNCLEAR') setRec(draft.recommendation);
              }}
            />
          </div>
        )}
      </AiBox>

      <div className="space-y-1.5">
        <Label htmlFor="ri-report">{t('ri.report')}</Label>
        <Textarea id="ri-report" className="min-h-32" value={report} onChange={(e) => setReport(e.target.value)} placeholder={t('ri.reportPh')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ri-income">{t('ri.verifiedIncome')}</Label>
          <Input id="ri-income" className="tabular-nums" inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value.replace(/\D/g, ''))} placeholder={String(app.declaredIncome)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('ri.recommendation')}</Label>
          <ChoiceGroup
            name="ri-rec"
            label={t('ri.recommendation')}
            value={rec}
            onChange={setRec}
            choices={[
              { value: 'APPROVE', label: t('ri.recApprove'), icon: ThumbsUp, tone: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
              { value: 'REJECT', label: t('ri.recReject'), icon: ThumbsDown, tone: 'border-red-600 bg-red-50 text-red-800' },
            ]}
          />
        </div>
      </div>

      {action.error && !returning && (
        <Alert variant="destructive">
          <AlertDescription>{action.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={!canForward || action.busy}
          onClick={() =>
            action
              .submit({ action: 'FORWARD', report: { notes: report, verifiedIncome: Number(income), recommendation: rec }, ai: feedbackFor(draftRun, used, report) })
              .catch(() => undefined)
          }
        >
          <Send aria-hidden /> {t('ri.forward')}
        </Button>
        <Button size="lg" variant="warn" onClick={() => { action.reset(); setReturning(true); }}>
          <RotateCcw aria-hidden /> {t('ri.returnToVa')}
        </Button>
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
    </Panel>
  );
}
