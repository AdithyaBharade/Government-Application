import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Eye, FileText, Image as ImageIcon, Paperclip, RefreshCw, Trash2, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { openDocument, useRemoveDocument, useUpload } from '../api/hooks';
import { errorMessage } from '../api/client';
import type { ApplicationDetail, DocType, DocumentInfo } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { Panel, Spinner } from './common';

const ALL_TYPES: DocType[] = ['AADHAAR', 'RATION_CARD', 'SELF_DECLARATION', 'SALARY_CERTIFICATE', 'RTC', 'FIELD_PHOTO', 'OTHER'];

export function DocumentsCard({ app, canUpload, defaultType }: { app: ApplicationDetail; canUpload: boolean; defaultType?: DocType }) {
  const { t } = useTranslation();
  const upload = useUpload(app.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocType>(defaultType ?? app.missingDocuments[0] ?? 'OTHER');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const remove = useRemoveDocument(app.id);
  const [toRemove, setToRemove] = useState<DocumentInfo | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; existing: DocumentInfo } | null>(null);
  // Same rule as the server: you can only remove what you uploaded, while you can still upload here.
  const canRemove = (d: DocumentInfo) => canUpload && !!user && d.uploadedBy?.id === user.id;

  async function confirmRemove() {
    if (!toRemove) return;
    setRemoveError(null);
    try {
      await remove.mutateAsync(toRemove.id);
      toast.success(t('docs.removed', { type: t(`docs.types.${toRemove.type}`) }));
      setToRemove(null);
    } catch (err) {
      setRemoveError(errorMessage(err));
    }
  }
  const items = ALL_TYPES.map((d) => ({ value: d, label: t(`docs.types.${d}`) }));

  async function send(file: File, replaceDocumentId?: string) {
    setError(null);
    try {
      await upload.mutateAsync({ file, type, replaceDocumentId });
      if (replaceDocumentId) toast.success(t('docs.replaced', { type: t(`docs.types.${type}`) }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /**
   * Before adding, look for a document this upload would duplicate: same type for the one-per-file
   * documents, or same file name for "Other"/field photos where several are normal. If the operator
   * could remove it, ask whether to replace it instead of piling up copies.
   */
  function findDuplicate(file: File): DocumentInfo | undefined {
    const many = type === 'OTHER' || type === 'FIELD_PHOTO';
    const same = app.documents.filter((d) => d.type === type && (!many || d.originalName === file.name));
    return same.reverse().find(canRemove); // latest one first
  }

  async function onFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    const dup = findDuplicate(file);
    if (dup) {
      setPending({ file, existing: dup });
      return;
    }
    await send(file);
  }

  async function resolvePending(choice: 'replace' | 'keep') {
    if (!pending) return;
    const { file, existing } = pending;
    setPending(null);
    await send(file, choice === 'replace' ? existing.id : undefined);
  }

  return (
    <Panel title={t('docs.title')} icon={<Paperclip className="size-4" aria-hidden />}>
      {app.missingDocuments.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-destructive">{t('docs.missing')}:</span>
          {app.missingDocuments.map((d) => (
            <Badge key={d} variant="destructive">{t(`docs.types.${d}`)}</Badge>
          ))}
        </div>
      )}

      {app.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('docs.none')}</p>
      ) : (
        <ul className="divide-y">
          {app.documents.map((d) => {
            const summary = (d.extracted as { summary?: string } | null)?.summary;
            return (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  {d.mimeType.startsWith('image/') ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t(`docs.types.${d.type}`)}</div>
                  <div className="truncate text-xs text-muted-foreground">{summary ?? d.originalName}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openDocument(d.id)}>
                  <Eye aria-hidden /> {t('docs.view')}
                </Button>
                {canRemove(d) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setRemoveError(null);
                      setToRemove(d);
                    }}
                    aria-label={`${t('docs.remove')}: ${t(`docs.types.${d.type}`)} – ${d.originalName}`}
                  >
                    <Trash2 aria-hidden /> <span className="max-sm:sr-only">{t('docs.remove')}</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canUpload && (
        <div className="mt-3 rounded-lg border border-dashed p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>{t('docs.chooseType')}</Label>
              <Select items={items} value={type} onValueChange={(v) => v && setType(v as DocType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Spinner label={t('docs.uploading')} /> : <><Upload aria-hidden /> {t('docs.upload')}</>}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{t('docs.hint')}</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <AlertDialog open={!!pending} onOpenChange={(next) => !next && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('docs.replaceTitle', { type: pending ? t(`docs.types.${pending.existing.type}`) : '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                t('docs.replaceBody', {
                  type: t(`docs.types.${pending.existing.type}`),
                  oldName: pending.existing.originalName,
                  newName: pending.file.name,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <Button variant="outline" onClick={() => resolvePending('keep')}>
              {t('docs.keepBoth')}
            </Button>
            <Button onClick={() => resolvePending('replace')} autoFocus>
              <RefreshCw aria-hidden /> {t('docs.replace')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={!!toRemove}
        title={t('docs.removeTitle')}
        confirmLabel={t('docs.remove')}
        tone="danger"
        busy={remove.isPending}
        error={removeError}
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      >
        {toRemove && (
          <p className="text-sm text-muted-foreground">
            {t('docs.removeBody', { type: t(`docs.types.${toRemove.type}`), name: toRemove.originalName })}
          </p>
        )}
      </ConfirmDialog>
    </Panel>
  );
}
