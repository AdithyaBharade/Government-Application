import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileBadge, Hourglass, RotateCcw, Send, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ApplicationDetail } from '../../api/types';
import { formatDate, rupees } from '../../lib/format';
import { useStageAction } from './useStageAction';

/** Operator: a returned file comes back to the front desk to collect documents from the citizen. */
export function OperatorPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const action = useStageAction(app.id);
  const blocked = app.missingDocuments.length > 0;
  return (
    <Card className="bg-amber-50/60 ring-amber-300">
      <CardContent className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold text-amber-900">
          <RotateCcw className="size-[18px]" aria-hidden /> {t('operator.title')}
        </h2>
        {app.lastReturnReason && (
          <div>
            <div className="mb-1 text-sm font-medium text-muted-foreground">{t('operator.reason')}</div>
            <p className="rounded-lg bg-card px-3 py-2 text-sm">{app.lastReturnReason}</p>
          </div>
        )}
        <p className="text-sm">{t('operator.instructions')}</p>
        {action.error && (
          <Alert variant="destructive">
            <AlertDescription>{action.error}</AlertDescription>
          </Alert>
        )}
        <Button size="lg" className="w-full sm:w-auto" disabled={blocked || action.busy} onClick={() => action.submit({ action: 'RESUBMIT' }).catch(() => undefined)}>
          <Send aria-hidden /> {t('operator.resubmit')}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Someone else's turn: read-only, says clearly who has the file. */
export function WaitingPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  if (!app.owner) return null;
  const role = t(`roles.${app.owner}`);
  return (
    <Alert>
      <Hourglass aria-hidden />
      <AlertTitle>{t('waiting.title', { role })}</AlertTitle>
      <AlertDescription>{t('waiting.body', { role })}</AlertDescription>
    </Alert>
  );
}

export function ClosedPanel({ app }: { app: ApplicationDetail }) {
  const { t } = useTranslation();
  const approved = app.stage === 'APPROVED';
  return (
    <Card className={cn(approved ? 'bg-emerald-50/60 ring-emerald-300' : 'bg-red-50/60 ring-red-300')}>
      <CardContent className="space-y-2">
        <h2 className={cn('flex flex-wrap items-center gap-2 font-semibold', approved ? 'text-emerald-800' : 'text-red-800')}>
          {approved ? <CheckCircle2 className="size-[18px]" aria-hidden /> : <XCircle className="size-[18px]" aria-hidden />}
          {t(`closed.${app.stage as 'APPROVED' | 'REJECTED'}`)}
          <span className="text-sm font-normal text-muted-foreground">· {formatDate(app.decidedAt)}</span>
        </h2>
        {app.decisionReason && <p className="text-sm whitespace-pre-line">{app.decisionReason}</p>}
        {approved && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm">
            <span>{t('closed.certNo')}: <b>{app.certificateNo}</b></span>
            <span>{t('fields.verifiedIncome')}: <b>{rupees(app.verifiedIncome)}</b></span>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to={`/applications/${app.id}/certificate`} />}>
              <FileBadge aria-hidden /> {t('closed.view')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
