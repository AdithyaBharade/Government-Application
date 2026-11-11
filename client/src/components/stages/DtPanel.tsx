import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Gavel, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAi } from '../../api/hooks';
import type { AiRun, ApplicationDetail, CaseBrief, Stage } from '../../api/types';
import { currentLang } from '../../i18n';
import { rupees } from '../../lib/format';
import { AiBox, feedbackFor, UseSuggestionButton } from '../AiBox';
import { Panel } from '../common';
import { ConfirmDialog } from '../ConfirmDialog';
import { ChoiceGroup } from './ChoiceGroup';
import { useStageAction } from './useStageAction';

type Decision = 'APPROVE' | 'REJECT' | 'RETURN';

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
  const targets = [
    { value: 'RI_VERIFICATION', label: t('roles.RI') },
    { value: 'VA_VERIFICATION', label: t('roles.VA') },
  ];

  return (
    <Panel title={t('dt.title')} icon={<Gavel className="size-[18px] text-brand-600" aria-hidden />} contentClassName="space-y-4">
      <AiBox title={t('ai.brief.title')} desc={t('ai.brief.desc')} run={run} pending={ai.isPending} error={ai.error} onRun={() => ai.mutate({ lang: currentLang() })}>
        {brief && (
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('ai.brief.summary')}</h4>
              <p className="mt-1 whitespace-pre-line">{brief.summary}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('ai.brief.comparison')}</h4>
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {brief.incomeComparison.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{row.source}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{rupees(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {brief.risks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('ai.brief.risks')}</h4>
                <ul className="mt-1 list-inside list-disc space-y-0.5">{brief.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            <div className="rounded-lg bg-ai-50 p-3">
              <p className="font-semibold text-ai-700">
                {t('ai.brief.suggests')}: {t(`ai.decisions.${brief.suggestedDecision}`)}{' '}
                <span className="font-normal text-muted-foreground">({t(`ai.brief.confidence.${brief.confidence}`)})</span>
              </p>
              <p className="mt-1">{brief.rationale}</p>
              <h4 className="mt-3 text-xs font-semibold text-muted-foreground uppercase">{t('ai.brief.draft')}</h4>
              <p className="mt-1 whitespace-pre-line">{brief.draftReason}</p>
              <UseSuggestionButton
                used={used === brief.draftReason}
                onUse={() => {
                  setReason(brief.draftReason);
                  setUsed(brief.draftReason);
                  if (brief.incomeForCertificate != null) setIncome(String(brief.incomeForCertificate));
                }}
              />
            </div>
          </div>
        )}
      </AiBox>

      {/* The decision itself is never pre-selected – the officer must choose. */}
      <ChoiceGroup<Decision>
        name="dt-decision"
        label={t('dt.title')}
        value={decision}
        onChange={setDecision}
        columns={3}
        choices={[
          { value: 'APPROVE', label: t('dt.approve'), icon: CheckCircle2, tone: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
          { value: 'REJECT', label: t('dt.reject'), icon: XCircle, tone: 'border-red-600 bg-red-50 text-red-800' },
          { value: 'RETURN', label: t('dt.return'), icon: RotateCcw, tone: 'border-amber-500 bg-amber-50 text-amber-900' },
        ]}
      />

      {decision === 'RETURN' && (
        <div className="space-y-1.5">
          <Label>{t('dt.returnTo')}</Label>
          <Select items={targets} value={target} onValueChange={(v) => v && setTarget(v as Stage)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {decision === 'APPROVE' && (
        <div className="space-y-1.5">
          <Label htmlFor="dt-income">{t('dt.certificateIncome')}</Label>
          <Input id="dt-income" className="tabular-nums" inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value.replace(/\D/g, ''))} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="dt-reason">{t('dt.reason')}</Label>
        <Textarea id="dt-reason" className="min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('dt.reasonPh')} />
      </div>

      <Button size="lg" className="w-full" disabled={!ready} onClick={() => { action.reset(); setConfirming(true); }}>
        <Gavel aria-hidden /> {t('dt.confirm')}
      </Button>

      <ConfirmDialog
        open={confirming && decision !== null}
        title={decision ? `${t('dt.confirm')}: ${t(`ai.decisions.${decision}`)}` : ''}
        confirmLabel={t('action.confirm')}
        tone={decision === 'REJECT' ? 'danger' : decision === 'RETURN' ? 'warn' : 'default'}
        busy={action.busy}
        error={action.error}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          decision &&
          action
            .submit({
              action: decision,
              target: decision === 'RETURN' ? target : undefined,
              reason,
              certificateIncome: decision === 'APPROVE' ? Number(income) : undefined,
              ai: feedbackFor(run, used, reason),
            })
            .catch(() => undefined)
        }
      >
        <p className="text-sm text-muted-foreground">{t('dt.confirmBody')}</p>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">{reason}</p>
        {decision === 'APPROVE' && (
          <p className="text-sm">
            {t('dt.certificateIncome')}: <b>{rupees(Number(income))}</b>
          </p>
        )}
      </ConfirmDialog>
    </Panel>
  );
}
