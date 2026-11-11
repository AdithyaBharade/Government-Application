import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, History } from 'lucide-react';
import { useApplication } from '../api/hooks';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ApplicationDetail, Role } from '../api/types';
import { formatDate } from '../lib/format';
import { ApplicantCard, ReportsCard } from '../components/ApplicantCard';
import { DocumentsCard } from '../components/DocumentsCard';
import { FlagChips, SlaBadge, StageBadge } from '../components/badges';
import { Stepper } from '../components/Stepper';
import { Timeline } from '../components/Timeline';
import { Card, ErrorState, PageLoader } from '../components/ui';
import { VaPanel } from '../components/stages/VaPanel';
import { RiPanel } from '../components/stages/RiPanel';
import { DtPanel } from '../components/stages/DtPanel';
import { ClosedPanel, OperatorPanel, WaitingPanel } from '../components/stages/StatusPanels';

/** The work area changes with the stage and with who is looking at it. */
function StagePanel({ app, role }: { app: ApplicationDetail; role: Role }) {
  if (app.stage === 'APPROVED' || app.stage === 'REJECTED') return <ClosedPanel app={app} />;
  if (app.owner !== role) return <WaitingPanel app={app} />;
  switch (app.stage) {
    case 'VA_VERIFICATION':
      return <VaPanel key={app.id} app={app} />;
    case 'RI_VERIFICATION':
      return <RiPanel key={app.id} app={app} />;
    case 'DT_DECISION':
      return <DtPanel key={app.id} app={app} />;
    case 'RETURNED_TO_APPLICANT':
      return <OperatorPanel app={app} />;
  }
}

export function ApplicationPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: app, isLoading, isError, error, refetch } = useApplication(id);

  if (isLoading) return <PageLoader />;
  if (isError || !app) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const mine = app.owner === user!.role;
  const operatorCanUpload = user!.role === 'OPERATOR' && (app.stage === 'VA_VERIFICATION' || app.stage === 'RETURNED_TO_APPLICANT');
  const showLocalName = app.applicantNameLocal && i18n.language !== 'en';

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
        <ArrowLeft size={16} aria-hidden /> {t('common.back')}
      </Link>

      <header className="card space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{showLocalName ? app.applicantNameLocal : app.applicantName}</h1>
            <p className="text-sm text-muted">
              {showLocalName && <>{app.applicantName} · </>}
              {app.appNo} · {app.village} · {t('fields.dueOn')}: {formatDate(app.dueAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StageBadge stage={app.stage} />
            <SlaBadge priority={app.priority} />
            <FlagChips flags={app.flags} />
          </div>
        </div>
        <Stepper stage={app.stage} />
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <StagePanel app={app} role={user!.role} />
          <DocumentsCard app={app} canUpload={mine || operatorCanUpload} defaultType={app.stage === 'RI_VERIFICATION' ? 'FIELD_PHOTO' : undefined} />
          <ReportsCard app={app} />
          <ApplicantCard app={app} />
        </div>
        <aside>
          <Card title={t('history.title')} icon={<History size={16} aria-hidden />} className="lg:sticky lg:top-20">
            <Timeline events={app.events} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
