import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplications } from '../api/hooks';
import { errorMessage } from '../api/client';
import type { Stage } from '../api/types';
import { ApplicationRow } from '../components/ApplicationRow';
import { ErrorState } from '../components/common';
import { useMediaQuery } from '../lib/useMediaQuery';

const RegisterGrid = lazy(() => import('../components/RegisterGrid'));

const STAGES: Stage[] = ['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT', 'APPROVED', 'REJECTED'];
const ALL = 'ALL';

/**
 * Every file in the office. Desktop: AG Grid register (sort, column filters, paging).
 * Phone: the same data as large tappable cards.
 */
export function ApplicationsPage() {
  const { t } = useTranslation();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [params, setParams] = useSearchParams();
  const stage = (params.get('stage') as Stage | null) ?? undefined;
  const [text, setText] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(text);

  // Wait until the officer stops typing before searching (slow rural connections)
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const { data, isLoading, isError, error, refetch } = useApplications('all', stage, q);
  const stageItems = [{ value: ALL, label: t('list.allStages') }, ...STAGES.map((s) => ({ value: s, label: t(`stages.${s}`) }))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">{t('nav.all')}</h1>
        {data && <span className="text-sm text-muted-foreground">{data.length}</span>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" className="pl-9" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('list.search')} aria-label={t('list.search')} />
        </div>
        <Select
          items={stageItems}
          value={stage ?? ALL}
          onValueChange={(v) => {
            const next = new URLSearchParams(params);
            if (v && v !== ALL) next.set('stage', String(v));
            else next.delete('stage');
            setParams(next, { replace: true });
          }}
        >
          <SelectTrigger className="w-full sm:w-64" aria-label={t('grid.stage')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stageItems.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : isError || !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : desktop ? (
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <RegisterGrid rows={data} />
        </Suspense>
      ) : (
        <Card className="gap-0 py-0">
          {data.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted-foreground">{t('list.empty')}</p>
          ) : (
            data.map((app) => <ApplicationRow key={app.id} app={app} showStage />)
          )}
        </Card>
      )}
    </div>
  );
}
