import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Printer } from 'lucide-react';
import { useApplication } from '../api/hooks';
import { errorMessage } from '../api/client';
import { Button } from '@/components/ui/button';
import { ErrorState, PageLoader } from '../components/common';
import { formatDate } from '../lib/format';

/** Printable certificate – clearly watermarked as a demo specimen. */
export function CertificatePage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { data: app, isLoading, isError, error, refetch } = useApplication(id);

  if (isLoading) return <PageLoader />;
  if (isError || !app) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (app.stage !== 'APPROVED') return <ErrorState message={t('closed.REJECTED')} />;

  const name = i18n.language === 'kn' && app.applicantNameLocal ? app.applicantNameLocal : app.applicantName;
  const address = `${app.address}, ${app.village}, ${app.hobli}, ${app.taluk}, ${app.district}`;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link to={`/applications/${app.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
          <ArrowLeft size={16} aria-hidden /> {t('common.back')}
        </Link>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden /> {t('certificate.print')}
        </Button>
      </div>

      <article className="relative mx-auto max-w-2xl overflow-hidden border-4 border-double border-brand-700 bg-card p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="-rotate-12 text-4xl font-black tracking-wider text-red-600/15 sm:text-5xl">{t('certificate.specimen')}</span>
        </div>
        <p className="text-center text-xs font-semibold text-red-700">{t('certificate.specimen')}</p>
        <h1 className="mt-4 text-center text-2xl font-bold text-brand-700">{t('certificate.title')}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{app.hobli} · {app.taluk} · {app.district}</p>

        <div className="mt-6 flex justify-between text-sm">
          <span>{t('closed.certNo')}: <b>{app.certificateNo}</b></span>
          <span>{t('certificate.date')}: <b>{formatDate(app.decidedAt)}</b></span>
        </div>

        <p className="mt-6 text-[17px] leading-loose">
          {t('certificate.body', {
            name,
            rel: app.gender === 'M' ? t('certificate.relM') : t('certificate.relF'),
            relation: app.relationName,
            address,
            income: new Intl.NumberFormat('en-IN').format(app.verifiedIncome ?? 0),
          })}
        </p>
        <p className="mt-4 text-sm">{t('certificate.purpose')}: <b>{app.purpose}</b></p>

        <div className="mt-14 flex justify-end">
          <div className="text-center text-sm">
            <div className="mb-1 h-10 w-40 border-b border-foreground" />
            <b>{t('certificate.signed')}</b>
            <div className="text-muted-foreground">{app.hobli}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
