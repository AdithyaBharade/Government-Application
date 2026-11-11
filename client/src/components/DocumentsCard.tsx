import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, FileText, Image as ImageIcon, Paperclip, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { openDocument, useUpload } from '../api/hooks';
import { errorMessage } from '../api/client';
import type { ApplicationDetail, DocType } from '../api/types';
import { Panel, Spinner } from './common';

const ALL_TYPES: DocType[] = ['AADHAAR', 'RATION_CARD', 'SELF_DECLARATION', 'SALARY_CERTIFICATE', 'RTC', 'FIELD_PHOTO', 'OTHER'];

export function DocumentsCard({ app, canUpload, defaultType }: { app: ApplicationDetail; canUpload: boolean; defaultType?: DocType }) {
  const { t } = useTranslation();
  const upload = useUpload(app.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocType>(defaultType ?? app.missingDocuments[0] ?? 'OTHER');
  const [error, setError] = useState<string | null>(null);
  const items = ALL_TYPES.map((d) => ({ value: d, label: t(`docs.types.${d}`) }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync({ file, type });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
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
    </Panel>
  );
}
