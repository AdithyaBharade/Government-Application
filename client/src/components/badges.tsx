import { useTranslation } from 'react-i18next';
import type { Priority, Stage } from '../api/types';

const STAGE_STYLE: Record<Stage, string> = {
  VA_VERIFICATION: 'bg-sky-50 text-sky-800 ring-sky-200',
  RI_VERIFICATION: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  DT_DECISION: 'bg-brand-50 text-brand-700 ring-brand-200',
  RETURNED_TO_APPLICANT: 'bg-amber-50 text-amber-900 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
};

export function StageBadge({ stage }: { stage: Stage }) {
  const { t } = useTranslation();
  return <span className={`chip ring-1 ${STAGE_STYLE[stage]}`}>{t(`stages.${stage}`)}</span>;
}

export function SlaBadge({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  const { sla, daysLeft } = priority;
  if (sla === 'CLOSED') return null;
  const style =
    sla === 'OVERDUE' ? 'bg-red-600 text-white' : sla === 'DUE_SOON' ? 'bg-amber-100 text-amber-900' : 'bg-canvas text-muted ring-1 ring-line';
  const label =
    sla === 'OVERDUE' ? t('sla.overdue', { count: Math.abs(daysLeft) }) : daysLeft === 0 ? t('sla.today') : t('sla.left', { count: daysLeft });
  return <span className={`chip ${style}`}>{label}</span>;
}

export function FlagChips({ flags }: { flags: string[] }) {
  const { t } = useTranslation();
  if (!flags.length) return null;
  return (
    <>
      {flags.map((f) => (
        <span key={f} className="chip bg-ai-50 text-ai-700 ring-1 ring-ai-100">
          {t(`ai.flags.${f}`, { defaultValue: f })}
        </span>
      ))}
    </>
  );
}
