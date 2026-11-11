/**
 * Document storage. Uses Cloudflare R2 (S3-compatible, private bucket) when configured,
 * otherwise stores bytes in PostgreSQL so the app still works with zero extra setup.
 * Files are never public – they are always streamed through the authenticated API.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env, r2Enabled } from '../../config/env';

const s3 = r2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    })
  : null;

export interface StoredFile {
  storage: 'r2' | 'db';
  storageKey: string | null;
  data: Uint8Array<ArrayBuffer> | null;
}

export async function putFile(applicationId: string, originalName: string, mimeType: string, body: Buffer): Promise<StoredFile> {
  if (!s3) return { storage: 'db', storageKey: null, data: new Uint8Array(body) };

  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
  const key = `applications/${applicationId}/${randomUUID()}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: mimeType }));
  return { storage: 'r2', storageKey: key, data: null };
}

export async function getFile(doc: { storage: string; storageKey: string | null; data: Uint8Array | null }): Promise<Buffer> {
  if (doc.storage === 'db') {
    if (!doc.data) throw new Error('Document bytes missing');
    return Buffer.from(doc.data);
  }
  if (!s3 || !doc.storageKey) throw new Error('R2 is not configured on this server');
  const res = await s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: doc.storageKey }));
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error('Empty object from R2');
  return Buffer.from(bytes);
}
