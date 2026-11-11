import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Priority, Stage } from '../api/types';

const STAGE_STYLE: Record<Stage, string> = {
  VA_VERIFICATION: 'bg-sky-50 text-sky-800 border-sky-200',
  RI_VERIFICATION: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  DT_DECISION: 'bg-brand-50 text-brand-700 border-brand-200',
  RETURNED_TO_APPLICANT: 'bg-amber-50 text-amber-900 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

export function StageBadge({ stage }: { stage: Stage }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={STAGE_STYLE[stage]}>
      {t(`stages.${stage}`)}
    </Badge>
  );
}

export function slaLabel(t: (k: string, o?: Record<string, unknown>) => string, p: Priority) {
  if (p.sla === 'CLOSED') return t('sla.closed');
  if (p.sla === 'OVERDUE') return t('sla.overdue', { count: Math.abs(p.daysLeft) });
  return p.daysLeft === 0 ? t('sla.today') : t('sla.left', { count: p.daysLeft });
}

export function SlaBadge({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  if (priority.sla === 'CLOSED') return null;
  return (
    <Badge
      variant={priority.sla === 'OVERDUE' ? 'default' : 'outline'}
      className={cn(
        priority.sla === 'OVERDUE' && 'bg-red-600 text-white',
        priority.sla === 'DUE_SOON' && 'border-amber-200 bg-amber-100 text-amber-900',
        priority.sla === 'ON_TRACK' && 'text-muted-foreground',
      )}
    >
      {slaLabel(t, priority)}
    </Badge>
  );
}

export function ReturnedBadge() {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
      <RotateCcw aria-hidden /> {t('reasons.RETURNED')}
    </Badge>
  );
}

export function FlagChips({ flags }: { flags: string[] }) {
  const { t } = useTranslation();
  if (!flags.length) return null;
  return (
    <>
      {flags.map((f) => (
        <Badge key={f} variant="outline" className="border-ai-100 bg-ai-50 text-ai-700">
          {t(`ai.flags.${f}`, { defaultValue: f })}
        </Badge>
      ))}
    </>
  );
}
