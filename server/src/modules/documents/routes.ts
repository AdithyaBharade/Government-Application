import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import { currentUser, requireAuth } from '../../middleware/auth';
import { ownerOf } from '../workflow/engine';
import { getFile, putFile } from './storage';

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
});

documentsRouter.post(
  '/applications/:id/documents',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { type } = typeSchema.parse(req.body);
    if (!req.file) throw badRequest('Attach a PDF or photo (max 5 MB)');

    const app = await prisma.application.findUnique({ where: { id: req.params.id }, select: { id: true, stage: true } });
    if (!app) throw notFound('Application');
    const operatorCanUpload = user.role === 'OPERATOR' && ['VA_VERIFICATION', 'RETURNED_TO_APPLICANT'].includes(app.stage);
    if (ownerOf(app.stage) !== user.role && !operatorCanUpload) throw forbidden('You cannot add documents at this stage');

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
      await tx.auditEvent.create({
        data: { applicationId: app.id, actorId: user.id, action: 'DOCUMENT_UPLOADED', meta: { type, documentId: created.id } },
      });
      return created;
    });
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
