import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser, requireAuth } from '../../middleware/auth';
import { caseBrief, documentCheck, fieldChecklist, reportDraft, setFeedback } from './service';

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.use(rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));

const langSchema = z.object({ lang: z.enum(['kn', 'en', 'hi', 'te', 'ta']).default('kn') });

aiRouter.post(
  '/applications/:id/ai/document-check',
  asyncHandler(async (req, res) => {
    const { lang } = langSchema.parse(req.body);
    res.json(await documentCheck(req.params.id, currentUser(req), lang));
  }),
);

aiRouter.post(
  '/applications/:id/ai/field-checklist',
  asyncHandler(async (req, res) => {
    const { lang } = langSchema.parse(req.body);
    res.json(await fieldChecklist(req.params.id, currentUser(req), lang));
  }),
);

aiRouter.post(
  '/applications/:id/ai/report-draft',
  asyncHandler(async (req, res) => {
    const { lang, notes } = langSchema.extend({ notes: z.string().max(5000) }).parse(req.body);
    res.json(await reportDraft(req.params.id, currentUser(req), lang, notes));
  }),
);

aiRouter.post(
  '/applications/:id/ai/case-brief',
  asyncHandler(async (req, res) => {
    const { lang } = langSchema.parse(req.body);
    res.json(await caseBrief(req.params.id, currentUser(req), lang));
  }),
);

aiRouter.post(
  '/ai-runs/:id/feedback',
  asyncHandler(async (req, res) => {
    const { feedback } = z.object({ feedback: z.enum(['ACCEPTED', 'EDITED', 'DISMISSED']) }).parse(req.body);
    await setFeedback(req.params.id, currentUser(req), feedback);
    res.status(204).end();
  }),
);
