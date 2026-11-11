import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from './common';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'default' | 'danger' | 'warn';
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Every state-changing decision goes through an explicit confirmation. */
export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'default', busy, disabled, error, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-3">{children}</div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction variant={tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : 'default'} onClick={onConfirm} disabled={busy || disabled}>
            {busy ? <Spinner /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Reason box used when returning or rejecting – the reason is shown to the next person. */
export function ReasonField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const short = value.trim().length > 0 && value.trim().length < 10;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t('action.reasonTitle')}</Label>
      <Textarea id={id} className="min-h-28" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? t('action.reasonPh')} autoFocus aria-invalid={short || undefined} />
      {short && <p className="text-xs text-destructive">{t('action.reasonShort')}</p>}
    </div>
  );
}
