import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, FileText, Image as ImageIcon, Paperclip, Upload } from 'lucide-react';
import { openDocument, useUpload } from '../api/hooks';
import { errorMessage } from '../api/client';
import type { ApplicationDetail, DocType } from '../api/types';
import { Card, Spinner } from './ui';

const ALL_TYPES: DocType[] = ['AADHAAR', 'RATION_CARD', 'SELF_DECLARATION', 'SALARY_CERTIFICATE', 'RTC', 'FIELD_PHOTO', 'OTHER'];

export function DocumentsCard({ app, canUpload, defaultType }: { app: ApplicationDetail; canUpload: boolean; defaultType?: DocType }) {
  const { t } = useTranslation();
  const upload = useUpload(app.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocType>(defaultType ?? app.missingDocuments[0] ?? 'OTHER');
  const [error, setError] = useState<string | null>(null);

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
    <Card title={t('docs.title')} icon={<Paperclip size={16} aria-hidden />}>
      {app.missingDocuments.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-red-700">{t('docs.missing')}:</span>
          {app.missingDocuments.map((d) => (
            <span key={d} className="chip bg-red-50 text-red-800 ring-1 ring-red-200">{t(`docs.types.${d}`)}</span>
          ))}
        </div>
      )}

      {app.documents.length === 0 ? (
        <p className="text-sm text-muted">{t('docs.none')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {app.documents.map((d) => {
            const summary = (d.extracted as { summary?: string } | null)?.summary;
            return (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-canvas text-muted">
                  {d.mimeType.startsWith('image/') ? <ImageIcon size={17} /> : <FileText size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t(`docs.types.${d.type}`)}</div>
                  <div className="truncate text-xs text-muted">{summary ?? d.originalName}</div>
                </div>
                <button className="btn-secondary min-h-9 px-3" onClick={() => openDocument(d.id)}>
                  <Eye size={15} aria-hidden /> {t('docs.view')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {canUpload && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-line p-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="label">{t('docs.chooseType')}</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as DocType)}>
              {ALL_TYPES.map((d) => (
                <option key={d} value={d}>{t(`docs.types.${d}`)}</option>
              ))}
            </select>
          </label>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Spinner label={t('docs.uploading')} /> : <><Upload size={16} aria-hidden /> {t('docs.upload')}</>}
          </button>
        </div>
      )}
      {canUpload && <p className="mt-1 text-xs text-muted">{t('docs.hint')}</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </Card>
  );
}
