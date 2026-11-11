import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, RotateCcw, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAi } from '../../api/hooks';
import type { AiRun, ApplicationDetail, DocumentCheck } from '../../api/types';
import { currentLang } from '../../i18n';
import { rupees } from '../../lib/format';
import { AiBox, CheckStatusChip, feedbackFor, UseSuggestionButton } from '../AiBox';
import { FlagChips } from '../badges';
import { Panel } from '../common';
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
    <Panel title={t('va.title')} icon={<ClipboardCheck className="size-[18px] text-brand-600" aria-hidden />} contentClassName="space-y-4">
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
              <Badge variant="outline" className={out.suggestedAction === 'RETURN' ? 'border-amber-200 bg-amber-100 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}>
                {out.suggestedAction === 'RETURN' ? t('ai.docCheck.suggestsReturn') : t('ai.docCheck.suggestsForward')}
              </Badge>
            </div>
            <ul className="divide-y rounded-lg border">
              {out.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <CheckStatusChip status={c.status} />
                  <div className="min-w-0">
                    <div className="font-medium">{c.item}</div>
                    <div className="text-muted-foreground">{c.detail}</div>
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
              <UseSuggestionButton
                used={used === out.suggestedRemarks}
                onUse={() => {
                  setRemarks(out.suggestedRemarks);
                  setUsed(out.suggestedRemarks);
                }}
              />
            </div>
          </div>
        )}
      </AiBox>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-muted-foreground">{t('va.checklistTitle')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHECKS.map((c) => (
            <Label
              key={c}
              htmlFor={`va-${c}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 font-normal has-data-checked:border-brand-500 has-data-checked:bg-brand-50"
            >
              <Checkbox id={`va-${c}`} checked={Boolean(checks[c])} onCheckedChange={(v) => setChecks({ ...checks, [c]: Boolean(v) })} />
              {t(`va.checklist.${c}`)}
            </Label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="va-remarks">{t('va.remarks')}</Label>
        <Textarea id="va-remarks" className="min-h-28" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t('va.remarksPh')} />
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
              .submit({ action: 'FORWARD', report: { notes: remarks, checklist: checks, recommendation: 'APPROVE' }, ai: feedbackFor(run, used, remarks) })
              .catch(() => undefined)
          }
        >
          <Send aria-hidden /> {t('va.forward')}
        </Button>
        <Button
          size="lg"
          variant="warn"
          onClick={() => {
            if (!reason && out?.suggestedAction === 'RETURN') {
              setReason(out.suggestedRemarks);
              setUsedReason(out.suggestedRemarks);
            }
            action.reset();
            setReturning(true);
          }}
        >
          <RotateCcw aria-hidden /> {t('va.returnToApplicant')}
        </Button>
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
    </Panel>
  );
}
