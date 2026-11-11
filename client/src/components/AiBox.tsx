import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Sparkles, ThumbsDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { errorCode, errorMessage } from '../api/client';
import { sendAiFeedback } from '../api/hooks';
import type { AiFeedback, AiRun, CheckStatus } from '../api/types';
import { Spinner } from './common';

interface Props {
  title: string;
  desc: string;
  run?: AiRun;
  pending: boolean;
  error: unknown;
  onRun: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * Every AI feature looks the same: clearly labelled, optional, re-runnable, dismissable.
 * The officer always sees that it is a suggestion, not a decision.
 */
export function AiBox({ title, desc, run, pending, error, onRun, disabled, children }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const isDismissed = run && (dismissed === run.id || run.feedback === 'DISMISSED');

  return (
    <section className="overflow-hidden rounded-xl border border-ai-100 bg-ai-50/60">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ai-600 text-white">
          <Sparkles className="size-[17px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ai-700">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Button variant={run ? 'outline' : 'ai'} size={run ? 'sm' : 'default'} onClick={onRun} disabled={pending || disabled}>
          {pending ? (
            <Spinner label={t('ai.running')} />
          ) : run ? (
            <><RefreshCw aria-hidden /> {t('ai.rerun')}</>
          ) : (
            <><Sparkles aria-hidden /> {t('ai.label')}</>
          )}
        </Button>
      </header>

      {Boolean(error) && !pending && (
        <Alert className="mx-4 mb-3 w-auto border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription className="text-amber-900">
            {errorCode(error) === 'AI_UNAVAILABLE' || errorMessage(error) === 'NETWORK' ? t('ai.unavailable') : errorMessage(error)}
          </AlertDescription>
        </Alert>
      )}

      {run && !pending && (
        <div className={cn('border-t border-ai-100 bg-card px-4 py-3', isDismissed && 'opacity-50')}>
          {children}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <p className="text-xs text-muted-foreground">{t('ai.disclaimer')}</p>
            {isDismissed ? (
              <span className="text-xs text-muted-foreground">{t('ai.dismissed')}</span>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => {
                  setDismissed(run.id);
                  void sendAiFeedback(run.id, 'DISMISSED');
                }}
              >
                <ThumbsDown aria-hidden /> {t('ai.dismiss')}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const STATUS_STYLE: Record<CheckStatus, string> = {
  OK: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  MISMATCH: 'border-red-200 bg-red-50 text-red-800',
  MISSING: 'border-red-200 bg-red-50 text-red-800',
  UNCLEAR: 'border-amber-200 bg-amber-50 text-amber-900',
};

export function CheckStatusChip({ status }: { status: CheckStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={STATUS_STYLE[status]}>
      {t(`ai.status.${status}`)}
    </Badge>
  );
}

/** "Use this" button shared by all AI suggestions. */
export function UseSuggestionButton({ used, onUse }: { used: boolean; onUse: () => void }) {
  const { t } = useTranslation();
  return (
    <Button variant="ai" size="sm" className="mt-2" onClick={onUse}>
      {used ? t('ai.used') : t('ai.use')}
    </Button>
  );
}

/**
 * How the officer used a suggestion, recorded with their action:
 * used as-is → ACCEPTED, used then changed → EDITED, never used → DISMISSED.
 */
export function feedbackFor(run: AiRun | undefined, used: string | null, final: string): { runId: string; feedback: AiFeedback } | undefined {
  if (!run) return undefined;
  if (used === null) return { runId: run.id, feedback: 'DISMISSED' };
  return { runId: run.id, feedback: used.trim() === final.trim() ? 'ACCEPTED' : 'EDITED' };
}
