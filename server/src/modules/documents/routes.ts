import type { Role, Stage } from '@prisma/client';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import { currentUser, requireAuth } from '../../middleware/auth';
import { ownerOf } from '../workflow/engine';
import { deleteFile, getFile, putFile } from './storage';

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

const ALLOWED = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.test(file.mimetype)),
});

const typeSchema = z.object({
  type: z.enum(['AADHAAR', 'RATION_CARD', 'SELF_DECLARATION', 'SALARY_CERTIFICATE', 'RTC', 'FIELD_PHOTO', 'OTHER']),
  /** When set, the new file takes the place of this document (same rules as removing it). */
  replaceDocumentId: z.string().min(1).optional(),
});

/** Who may add or remove documents: the desk that owns the file, or the operator while it is with the VA or returned. */
function canChangeDocuments(role: Role, stage: Stage) {
  const operatorCanUpload = role === 'OPERATOR' && (stage === 'VA_VERIFICATION' || stage === 'RETURNED_TO_APPLICANT');
  return ownerOf(stage) === role || operatorCanUpload;
}

documentsRouter.post(
  '/applications/:id/documents',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { type, replaceDocumentId } = typeSchema.parse(req.body);
    if (!req.file) throw badRequest('Attach a PDF or photo (max 5 MB)');

    const app = await prisma.application.findUnique({ where: { id: req.params.id }, select: { id: true, stage: true } });
    if (!app) throw notFound('Application');
    if (!canChangeDocuments(user.role, app.stage)) throw forbidden('You cannot add documents at this stage');

    const old = replaceDocumentId
      ? await prisma.document.findUnique({
          where: { id: replaceDocumentId },
          select: { id: true, applicationId: true, uploadedById: true, storage: true, storageKey: true, originalName: true },
        })
      : null;
    if (replaceDocumentId) {
      if (!old || old.applicationId !== app.id) throw notFound('Document to replace');
      if (old.uploadedById !== user.id) throw forbidden('Only the person who uploaded this document can replace it');
    }

    const stored = await putFile(app.id, req.file.originalname, req.file.mimetype, req.file.buffer);
    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          applicationId: app.id,
          type,
          originalName: req.file!.originalname,
          mimeType: req.file!.mimetype,
          size: req.file!.size,
          ...stored,
          uploadedById: user.id,
        },
        select: { id: true, type: true, originalName: true, mimeType: true, size: true, createdAt: true },
      });
      if (old) await tx.document.delete({ where: { id: old.id } });
      await tx.auditEvent.create({
        data: {
          applicationId: app.id,
          actorId: user.id,
          action: 'DOCUMENT_UPLOADED',
          meta: old
            ? { type, documentId: created.id, replacedDocumentId: old.id, replacedName: old.originalName }
            : { type, documentId: created.id },
        },
      });
      return created;
    });
    if (old) await deleteFile(old).catch((err) => console.error('Failed to delete replaced file', old.id, err));
    res.status(201).json(doc);
  }),
);

documentsRouter.get(
  '/documents/:id/file',
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('Document');
    const bytes = await getFile(doc);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(bytes);
  }),
);

/**
 * Remove a document uploaded by mistake (wrong file, duplicate). Only the person who uploaded it can
 * remove it, and only while they could still upload at this stage – so evidence another desk relied
 * on can't disappear. The removal is kept in the file's history.
 */
documentsRouter.delete(
  '/documents/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      select: { id: true, type: true, originalName: true, storage: true, storageKey: true, uploadedById: true, application: { select: { id: true, stage: true } } },
    });
    if (!doc) throw notFound('Document');
    if (doc.uploadedById !== user.id) throw forbidden('Only the person who uploaded this document can remove it');
    if (!canChangeDocuments(user.role, doc.application.stage)) throw forbidden('Documents cannot be removed at this stage');

    await prisma.$transaction([
      prisma.document.delete({ where: { id: doc.id } }),
      prisma.auditEvent.create({
        data: {
          applicationId: doc.application.id,
          actorId: user.id,
          action: 'DOCUMENT_REMOVED',
          meta: { type: doc.type, documentId: doc.id, originalName: doc.originalName },
        },
      }),
    ]);
    // Delete stored bytes after the row is gone; a failure here only leaves an orphaned object.
    await deleteFile(doc).catch((err) => console.error('Failed to delete stored file', doc.id, err));
    res.status(204).end();
  }),
);
