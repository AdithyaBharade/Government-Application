import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import {
  actionSchema,
  createApplication,
  createSchema,
  dashboardSummary,
  getApplication,
  listApplications,
  performAction,
} from './service';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

const listQuery = z.object({
  scope: z.enum(['queue', 'all']).default('queue'),
  stage: z
    .enum(['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT', 'APPROVED', 'REJECTED'])
    .optional(),
  q: z.string().trim().max(100).optional(),
});

applicationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ items: await listApplications(currentUser(req), listQuery.parse(req.query)) });
  }),
);

applicationsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    res.json(await dashboardSummary(currentUser(req)));
  }),
);

applicationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getApplication(req.params.id, currentUser(req)));
  }),
);

applicationsRouter.post(
  '/',
  requireRole('OPERATOR'),
  asyncHandler(async (req, res) => {
    const app = await createApplication(currentUser(req), createSchema.parse(req.body));
    res.status(201).json({ id: app.id, appNo: app.appNo });
  }),
);

applicationsRouter.post(
  '/:id/actions',
  asyncHandler(async (req, res) => {
    res.json(await performAction(req.params.id, currentUser(req), actionSchema.parse(req.body)));
  }),
);
