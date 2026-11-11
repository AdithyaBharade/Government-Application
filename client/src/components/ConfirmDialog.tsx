import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from './ui';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger' | 'warn';
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'primary', busy, disabled, error, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const btn = tone === 'danger' ? 'btn-danger' : tone === 'warn' ? 'btn bg-amber-600 text-white hover:bg-amber-700' : 'btn-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 space-y-3">{children}</div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>{t('action.cancel')}</button>
          <button className={btn} onClick={onConfirm} disabled={busy || disabled}>
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reason box used when returning or rejecting – the reason is shown to the next person. */
export function ReasonField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useTranslation();
  const short = value.trim().length > 0 && value.trim().length < 10;
  return (
    <label className="block">
      <span className="label">{t('action.reasonTitle')}</span>
      <textarea className="input min-h-28" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? t('action.reasonPh')} autoFocus />
      {short && <span className="mt-1 block text-xs text-red-700">{t('action.reasonShort')}</span>}
    </label>
  );
}
