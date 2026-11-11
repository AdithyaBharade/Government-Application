import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, RotateCcw } from 'lucide-react';
import type { ApplicationSummary } from '../api/types';
import { displayName, formatDate, rupees } from '../lib/format';
import { FlagChips, SlaBadge, StageBadge } from './badges';

/** One application in a list. Big tap target, the "why it's urgent" visible at a glance. */
export function ApplicationRow({ app, showStage = false }: { app: ApplicationSummary; showStage?: boolean }) {
  const { t } = useTranslation();
  const urgent = app.priority.sla === 'OVERDUE';
  return (
    <Link
      to={`/applications/${app.id}`}
      className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-canvas ${urgent ? 'border-l-4 border-l-red-600' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{displayName(app)}</span>
          <span className="text-xs text-muted">{app.appNo}</span>
        </div>
        <div className="mt-0.5 text-sm text-muted">
          {app.village} · {app.purpose} · {t('list.declared')} {rupees(app.declaredIncome)}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {showStage && <StageBadge stage={app.stage} />}
          <SlaBadge priority={app.priority} />
          {app.returnCount > 0 && app.priority.sla !== 'CLOSED' && (
            <span className="chip bg-amber-50 text-amber-900 ring-1 ring-amber-200">
              <RotateCcw size={12} aria-hidden /> {t('reasons.RETURNED')}
            </span>
          )}
          <FlagChips flags={app.flags} />
          {app.priority.sla === 'CLOSED' && <span className="text-xs text-muted">{formatDate(app.decidedAt)}</span>}
        </div>
      </div>
      <ChevronRight className="shrink-0 text-muted" size={18} aria-hidden />
    </Link>
  );
}
