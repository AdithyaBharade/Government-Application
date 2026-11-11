import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Sparkles, ThumbsDown } from 'lucide-react';
import { errorCode, errorMessage } from '../api/client';
import { sendAiFeedback } from '../api/hooks';
import type { AiFeedback, AiRun, CheckStatus } from '../api/types';
import { Spinner } from './ui';

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
    <section className="rounded-xl border border-ai-100 bg-ai-50/60">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ai-600 text-white">
          <Sparkles size={17} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ai-700">{title}</h3>
          <p className="text-xs text-muted">{desc}</p>
        </div>
        <button className={run ? 'btn-secondary min-h-9 px-3' : 'btn-ai'} onClick={onRun} disabled={pending || disabled}>
          {pending ? <Spinner label={t('ai.running')} /> : run ? <><RefreshCw size={14} aria-hidden /> {t('ai.rerun')}</> : <><Sparkles size={15} aria-hidden /> {t('ai.label')}</>}
        </button>
      </header>

      {Boolean(error) && !pending && (
        <p className="mx-4 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {errorCode(error) === 'AI_UNAVAILABLE' || errorMessage(error) === 'NETWORK' ? t('ai.unavailable') : errorMessage(error)}
        </p>
      )}

      {run && !pending && (
        <div className={`border-t border-ai-100 bg-white px-4 py-3 ${isDismissed ? 'opacity-50' : ''}`}>
          {children}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
            <p className="text-xs text-muted">{t('ai.disclaimer')}</p>
            {isDismissed ? (
              <span className="text-xs text-muted">{t('ai.dismissed')}</span>
            ) : (
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
                onClick={() => {
                  setDismissed(run.id);
                  void sendAiFeedback(run.id, 'DISMISSED');
                }}
              >
                <ThumbsDown size={13} aria-hidden /> {t('ai.dismiss')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const STATUS_STYLE: Record<CheckStatus, string> = {
  OK: 'bg-emerald-50 text-emerald-800',
  MISMATCH: 'bg-red-50 text-red-800',
  MISSING: 'bg-red-50 text-red-800',
  UNCLEAR: 'bg-amber-50 text-amber-900',
};

export function CheckStatusChip({ status }: { status: CheckStatus }) {
  const { t } = useTranslation();
  return <span className={`chip ${STATUS_STYLE[status]}`}>{t(`ai.status.${status}`)}</span>;
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
