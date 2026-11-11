import { Check, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Stage } from '../api/types';

const STEPS = ['received', 'va', 'ri', 'dt', 'done'] as const;

const CURRENT: Record<Stage, number> = {
  RETURNED_TO_APPLICANT: 1,
  VA_VERIFICATION: 1,
  RI_VERIFICATION: 2,
  DT_DECISION: 3,
  APPROVED: 4,
  REJECTED: 4,
};

/** Where the file is in the process. Readable on a 360px phone. */
export function Stepper({ stage }: { stage: Stage }) {
  const { t } = useTranslation();
  const current = CURRENT[stage];
  const closed = stage === 'APPROVED' || stage === 'REJECTED';

  return (
    <ol className="flex items-start" aria-label="Progress">
      {STEPS.map((step, i) => {
        const done = i < current || (closed && i === current);
        const active = i === current && !closed;
        const returned = active && stage === 'RETURNED_TO_APPLICANT';
        const rejected = closed && stage === 'REJECTED' && i === current;
        const dot = rejected
          ? 'bg-red-600 text-white'
          : done
            ? 'bg-brand-700 text-white'
            : returned
              ? 'bg-amber-500 text-white ring-4 ring-amber-100'
              : active
                ? 'bg-white text-brand-700 ring-2 ring-brand-500'
                : 'bg-canvas text-muted ring-1 ring-line';
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center gap-1 text-center" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className={`absolute top-3.5 right-1/2 h-0.5 w-full -translate-x-3.5 ${i <= current ? 'bg-brand-500' : 'bg-line'}`} aria-hidden />}
            <span className={`relative z-10 grid size-7 place-items-center rounded-full text-xs font-bold ${dot}`}>
              {rejected ? <X size={14} /> : done ? <Check size={14} /> : returned ? <RotateCcw size={13} /> : i + 1}
            </span>
            <span className={`text-[11px] leading-tight sm:text-xs ${active ? 'font-semibold text-ink' : 'text-muted'}`}>{t(`stepper.${step}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}
