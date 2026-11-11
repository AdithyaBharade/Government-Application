import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApplicationSummary } from '../api/types';
import { displayName, formatDate, rupees } from '../lib/format';
import { FlagChips, ReturnedBadge, SlaBadge, StageBadge } from './badges';

/** One application in a list. Big tap target, the "why it's urgent" visible at a glance. */
export function ApplicationRow({ app, showStage = false }: { app: ApplicationSummary; showStage?: boolean }) {
  const { t } = useTranslation();
  const urgent = app.priority.sla === 'OVERDUE';
  return (
    <Link
      to={`/applications/${app.id}`}
      className={cn('flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/60', urgent && 'border-l-4 border-l-red-600')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{displayName(app)}</span>
          <span className="text-xs text-muted-foreground">{app.appNo}</span>
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {app.village} · {app.purpose} · {t('list.declared')} {rupees(app.declaredIncome)}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {showStage && <StageBadge stage={app.stage} />}
          <SlaBadge priority={app.priority} />
          {app.returnCount > 0 && app.priority.sla !== 'CLOSED' && <ReturnedBadge />}
          <FlagChips flags={app.flags} />
          {app.priority.sla === 'CLOSED' && <span className="text-xs text-muted-foreground">{formatDate(app.decidedAt)}</span>}
        </div>
      </div>
      <ChevronRight className="shrink-0 text-muted-foreground" size={18} aria-hidden />
    </Link>
  );
}
