import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

/** Skeletons instead of a spinner: the page shape appears instantly, even on slow 3G. */
export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t('common.loading')}>
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation();
  return (
    <Alert className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangle className="text-amber-600" aria-hidden />
      <AlertDescription className="text-base text-foreground">
        {message === 'NETWORK' ? t('common.network') : (message ?? t('common.error'))}
      </AlertDescription>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </Alert>
  );
}

/** A titled shadcn Card – the standard panel on every screen. */
export function Panel({ title, icon, action, children, className, contentClassName }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; contentClassName?: string }) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            {icon}
            {title}
          </CardTitle>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{value}</dd>
    </div>
  );
}
