import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useApplications } from '../api/hooks';
import { errorMessage } from '../api/client';
import type { Stage } from '../api/types';
import { ApplicationRow } from '../components/ApplicationRow';
import { ErrorState, PageLoader } from '../components/ui';

const STAGES: Stage[] = ['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT', 'APPROVED', 'REJECTED'];

/** Every file in the office – search by name, application number or village. */
export function ApplicationsPage() {
  const { t } = useTranslation();
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('nav.all')}</h1>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
          <span className="sr-only">{t('list.search')}</span>
          <input className="input pl-10" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('list.search')} />
        </label>
        <select
          className="input sm:w-64"
          value={stage ?? ''}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('stage', e.target.value);
            else next.delete('stage');
            setParams(next, { replace: true });
          }}
        >
          <option value="">{t('list.allStages')}</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{t(`stages.${s}`)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <section className="card overflow-hidden">
          {data.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted">{t('list.empty')}</p>
          ) : (
            data.map((app) => <ApplicationRow key={app.id} app={app} showStage />)
          )}
        </section>
      )}
    </div>
  );
}
