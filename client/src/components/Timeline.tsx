import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, FilePlus2, Paperclip, RotateCcw, Send, Sparkles, XCircle } from 'lucide-react';
import type { AuditEvent } from '../api/types';
import { formatDateTime, personName } from '../lib/format';

const ICON = {
  CREATED: { icon: FilePlus2, tone: 'bg-brand-50 text-brand-700' },
  DOCUMENT_UPLOADED: { icon: Paperclip, tone: 'bg-canvas text-muted' },
  AI_ASSIST: { icon: Sparkles, tone: 'bg-ai-50 text-ai-600' },
  FORWARDED: { icon: Send, tone: 'bg-brand-50 text-brand-700' },
  RETURNED: { icon: RotateCcw, tone: 'bg-amber-50 text-amber-800' },
  RESUBMITTED: { icon: ArrowRight, tone: 'bg-brand-50 text-brand-700' },
  APPROVED: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { icon: XCircle, tone: 'bg-red-50 text-red-700' },
} as const;

/** Full, append-only history of the file: who did what, when, and how AI was used. */
export function Timeline({ events }: { events: AuditEvent[] }) {
  const { t } = useTranslation();

  const label = (e: AuditEvent) => {
    switch (e.action) {
      case 'DOCUMENT_UPLOADED':
        return t('history.DOCUMENT_UPLOADED', { type: t(`docs.types.${String(e.meta?.type ?? 'OTHER')}`) });
      case 'AI_ASSIST':
        return t('history.AI_ASSIST', { kind: t(`ai.kinds.${String(e.meta?.kind)}`) });
      case 'FORWARDED':
      case 'RETURNED':
        return t(`history.${e.action}`, { to: e.toStage ? t(`stages.${e.toStage}`) : '' });
      default:
        return t(`history.${e.action}`);
    }
  };

  return (
    <ol className="space-y-0">
      {[...events].reverse().map((e, idx, arr) => {
        const { icon: Icon, tone } = ICON[e.action];
        const agreed = e.meta?.agreedWithAi;
        return (
          <li key={e.id} className="relative flex gap-3 pb-4">
            {idx < arr.length - 1 && <span className="absolute top-8 bottom-0 left-4 w-px bg-line" aria-hidden />}
            <span className={`relative grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon size={15} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-medium">{label(e)}</p>
              <p className="text-xs text-muted">
                {e.actor ? `${personName(e.actor)} · ${t(`rolesShort.${e.actor.role}`)} · ` : ''}
                {formatDateTime(e.createdAt)}
              </p>
              {e.comment && e.action !== 'AI_ASSIST' && (
                <p className="mt-1.5 rounded-lg bg-canvas px-3 py-2 text-sm whitespace-pre-line">{e.comment}</p>
              )}
              {agreed !== undefined && (
                <p className={`mt-1 text-xs font-medium ${agreed ? 'text-muted' : 'text-ai-700'}`}>
                  <Sparkles size={11} className="mr-1 inline" aria-hidden />
                  {agreed ? t('history.agreed') : t('history.differed', { s: t(`ai.decisions.${String(e.meta?.aiSuggestedDecision)}`) })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
