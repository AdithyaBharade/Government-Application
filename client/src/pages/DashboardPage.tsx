import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, CalendarClock, FilePlus2, Inbox, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApplications, useSummary } from '../api/hooks';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ApplicationRow } from '../components/ApplicationRow';
import { ErrorState, PageLoader } from '../components/common';
import { personName } from '../lib/format';
import type { Stage } from '../api/types';

const PIPELINE: Stage[] = ['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT'];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const summary = useSummary();
  const queue = useApplications('queue');

  if (summary.isLoading || queue.isLoading) return <PageLoader />;
  if (summary.isError || queue.isError || !summary.data || !queue.data) {
    return <ErrorState message={errorMessage(summary.error ?? queue.error)} onRetry={() => { summary.refetch(); queue.refetch(); }} />;
  }

  const s = summary.data.queue;
  const tiles = [
    { label: t('dashboard.tiles.queue'), value: s.total, icon: Inbox, tone: 'text-brand-700 bg-brand-50' },
    { label: t('dashboard.tiles.overdue'), value: s.overdue, icon: AlertOctagon, tone: s.overdue ? 'text-white bg-red-600' : 'text-muted-foreground bg-muted' },
    { label: t('dashboard.tiles.dueSoon'), value: s.dueSoon, icon: CalendarClock, tone: s.dueSoon ? 'text-amber-900 bg-amber-100' : 'text-muted-foreground bg-muted' },
    { label: t('dashboard.tiles.returned'), value: s.returned, icon: RotateCcw, tone: 'text-amber-900 bg-amber-50' },
    { label: t('dashboard.tiles.flagged'), value: s.flagged, icon: Sparkles, tone: 'text-ai-700 bg-ai-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('dashboard.greeting', { name: personName(user) })}</h1>
          <p className="text-sm text-muted-foreground">
            {t(`roles.${user!.role}`)} · {user!.office}
          </p>
        </div>
        {user!.role === 'OPERATOR' && (
          <Button size="lg" nativeButton={false} render={<Link to="/applications/new" />}>
            <FilePlus2 aria-hidden /> {t('nav.new')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label} size="sm" className="flex-row items-center gap-3 px-3">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tile.tone)}>
              <tile.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-2xl leading-none font-bold tabular-nums">{tile.value}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{tile.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card className="h-fit gap-0 py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>{t('dashboard.attention')}</CardTitle>
            <CardDescription>{t('dashboard.subtitle')}</CardDescription>
          </CardHeader>
          {queue.data.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted-foreground">{t('dashboard.empty')}</p>
          ) : (
            queue.data.map((app) => <ApplicationRow key={app.id} app={app} />)
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t('dashboard.pipeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1">
              {PIPELINE.map((stage) => (
                <li key={stage}>
                  <Link to={`/applications?stage=${stage}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted">
                    <span>{t(`stages.${stage}`)}</span>
                    <span className="font-bold tabular-nums">{summary.data.byStage[stage] ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link to="/applications" className="mt-2 block px-2 text-sm font-semibold text-brand-600">
              {t('dashboard.seeAll')} →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
