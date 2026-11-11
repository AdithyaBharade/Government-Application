import type { AuditAction, Prisma, Stage } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError, forbidden, notFound } from '../../lib/errors';
import { env } from '../../config/env';
import type { AuthUser } from '../../middleware/auth';
import {
  ACTIVE_STAGES,
  allowedActions,
  computePriority,
  ownerOf,
  resolveTransition,
  WorkflowError,
  type WorkflowAction,
} from '../workflow/engine';
import { missingDocuments, requiredDocuments, sumIncome } from './rules';

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const money = z.coerce.number().int().min(0).max(100_000_000);

export const createSchema = z.object({
  applicantName: z.string().trim().min(2).max(100),
  applicantNameLocal: z.string().trim().max(100).optional().or(z.literal('')),
  relationName: z.string().trim().min(2).max(100),
  gender: z.enum(['M', 'F', 'O']),
  dob: z.coerce.date().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  aadhaarLast4: z.string().regex(/^\d{4}$/, 'Enter last 4 digits of Aadhaar'),
  address: z.string().trim().min(3).max(300),
  village: z.string().trim().min(2).max(100),
  hobli: z.string().trim().min(2).max(100),
  taluk: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  occupation: z.string().trim().min(2).max(100),
  purpose: z.string().trim().min(2).max(100),
  incomeSources: z.object({ agriculture: money, salary: money, business: money, other: money }),
  landAcres: z.coerce.number().min(0).max(1000).optional(),
  familySize: z.coerce.number().int().min(1).max(30),
});

export const actionSchema = z.object({
  action: z.enum(['FORWARD', 'RETURN', 'APPROVE', 'REJECT', 'RESUBMIT']),
  target: z.enum(['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT']).optional(),
  reason: z.string().trim().max(2000).optional(),
  report: z
    .object({
      notes: z.string().trim().min(10, 'Report is too short').max(5000),
      verifiedIncome: money.optional(),
      recommendation: z.enum(['APPROVE', 'REJECT']).optional(),
      checklist: z.record(z.string(), z.boolean()).optional(),
    })
    .optional(),
  certificateIncome: money.optional(),
  ai: z
    .object({ runId: z.string(), feedback: z.enum(['ACCEPTED', 'EDITED', 'DISMISSED']) })
    .optional(),
});

export type ActionInput = z.infer<typeof actionSchema>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const listSelect = {
  id: true,
  appNo: true,
  applicantName: true,
  applicantNameLocal: true,
  village: true,
  purpose: true,
  declaredIncome: true,
  stage: true,
  receivedAt: true,
  dueAt: true,
  stageEnteredAt: true,
  returnCount: true,
  lastReturnReason: true,
  flags: true,
  decidedAt: true,
} satisfies Prisma.ApplicationSelect;

export async function listApplications(
  user: AuthUser,
  opts: { scope: 'queue' | 'all'; stage?: Stage; q?: string },
) {
  const where: Prisma.ApplicationWhereInput = {};
  if (opts.scope === 'queue') {
    where.stage = { in: ACTIVE_STAGES.filter((s) => ownerOf(s) === user.role) };
  } else if (opts.stage) {
    where.stage = opts.stage;
  }
  if (opts.q) {
    where.OR = [
      { appNo: { contains: opts.q, mode: 'insensitive' } },
      { applicantName: { contains: opts.q, mode: 'insensitive' } },
      { applicantNameLocal: { contains: opts.q } },
      { village: { contains: opts.q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.application.findMany({ where, select: listSelect, orderBy: { receivedAt: 'desc' }, take: 300 });
  const now = new Date();
  const items = rows.map((r) => ({ ...r, priority: computePriority(r, now) }));
  if (opts.scope === 'queue') items.sort((a, b) => b.priority.score - a.priority.score);
  return items;
}

export async function dashboardSummary(user: AuthUser) {
  const [byStage, queue] = await Promise.all([
    prisma.application.groupBy({ by: ['stage'], _count: true }),
    listApplications(user, { scope: 'queue' }),
  ]);
  return {
    byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count])),
    queue: {
      total: queue.length,
      overdue: queue.filter((a) => a.priority.sla === 'OVERDUE').length,
      dueSoon: queue.filter((a) => a.priority.sla === 'DUE_SOON').length,
      returned: queue.filter((a) => a.returnCount > 0).length,
      flagged: queue.filter((a) => a.flags.length > 0).length,
    },
    top: queue.slice(0, 5),
  };
}

export async function getApplication(id: string, user: AuthUser) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      documents: {
        select: { id: true, type: true, originalName: true, mimeType: true, size: true, extracted: true, createdAt: true, uploadedBy: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      reports: { include: { author: { select: { name: true, nameLocal: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      events: { include: { actor: { select: { name: true, nameLocal: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      aiRuns: { orderBy: { createdAt: 'desc' }, select: { id: true, kind: true, stage: true, output: true, feedback: true, latencyMs: true, lang: true, createdAt: true } },
    },
  });
  if (!app) throw notFound('Application');

  // Only the latest AI run of each kind at the current stage is offered as "current help".
  const latestAi: Record<string, (typeof app.aiRuns)[number]> = {};
  for (const run of app.aiRuns) {
    if (run.stage === app.stage && !latestAi[run.kind]) latestAi[run.kind] = run;
  }

  return {
    ...app,
    aiRuns: undefined,
    latestAi,
    aiHistory: app.aiRuns.map(({ output: _o, ...rest }) => rest),
    priority: computePriority(app),
    owner: ownerOf(app.stage),
    allowedActions: allowedActions(app.stage, user.role),
    requiredDocuments: requiredDocuments(app),
    missingDocuments: missingDocuments(app, app.documents),
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function nextAppNo(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IC${year}`;
  const last = await tx.application.findFirst({
    where: { appNo: { startsWith: prefix } },
    orderBy: { appNo: 'desc' },
    select: { appNo: true },
  });
  const seq = last ? Number(last.appNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

export async function createApplication(user: AuthUser, input: z.infer<typeof createSchema>) {
  if (user.role !== 'OPERATOR') throw forbidden('Only the front-desk operator registers applications');
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const appNo = await nextAppNo(tx);
    const app = await tx.application.create({
      data: {
        ...input,
        applicantNameLocal: input.applicantNameLocal || null,
        declaredIncome: sumIncome(input.incomeSources),
        appNo,
        receivedAt: now,
        stageEnteredAt: now,
        dueAt: new Date(now.getTime() + env.SLA_DAYS * DAY),
        createdById: user.id,
      },
    });
    await tx.auditEvent.create({
      data: { applicationId: app.id, actorId: user.id, action: 'CREATED', toStage: 'VA_VERIFICATION' },
    });
    return app;
  });
}

const AUDIT_FOR: Record<WorkflowAction, AuditAction> = {
  FORWARD: 'FORWARDED',
  RETURN: 'RETURNED',
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  RESUBMIT: 'RESUBMITTED',
};

export async function performAction(id: string, user: AuthUser, input: ActionInput) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id },
      include: { reports: { orderBy: { createdAt: 'desc' } }, documents: { select: { type: true } } },
    });
    if (!app) throw notFound('Application');

    let next: Stage;
    try {
      next = resolveTransition({
        stage: app.stage,
        role: user.role,
        action: input.action,
        target: input.target,
        reason: input.reason,
        hasReport: Boolean(input.report),
      });
    } catch (e) {
      if (e instanceof WorkflowError) throw new AppError(e.code === 'NOT_OWNER' ? 403 : 400, e.code, e.message);
      throw e;
    }

    if (input.action === 'RESUBMIT' && missingDocuments(app, app.documents).length > 0) {
      throw new AppError(400, 'MISSING_DOCUMENTS', 'Upload all required documents before resubmitting');
    }

    const now = new Date();
    if (input.report) {
      await tx.stageReport.create({
        data: {
          applicationId: id,
          stage: app.stage,
          authorId: user.id,
          notes: input.report.notes,
          verifiedIncome: input.report.verifiedIncome,
          recommendation: input.report.recommendation,
          checklist: input.report.checklist,
        },
      });
    }

    const data: Prisma.ApplicationUpdateInput = { stage: next, stageEnteredAt: now };
    if (input.report?.verifiedIncome !== undefined) data.verifiedIncome = input.report.verifiedIncome;
    if (input.action === 'RETURN') {
      data.returnCount = { increment: 1 };
      data.lastReturnReason = input.reason;
    }
    if (input.action === 'RESUBMIT') data.flags = [];
    if (input.action === 'APPROVE' || input.action === 'REJECT') {
      data.decidedAt = now;
      data.decisionReason = input.reason;
    }
    if (input.action === 'APPROVE') {
      const riIncome = app.reports.find((r) => r.stage === 'RI_VERIFICATION')?.verifiedIncome;
      data.verifiedIncome = input.certificateIncome ?? riIncome ?? app.verifiedIncome ?? app.declaredIncome;
      data.certificateNo = `RD-KDT-${now.getFullYear()}-${app.appNo.slice(-6)}`;
    }

    // Guard against two officers (or a double click) acting on the same stage at once.
    const updated = await tx.application.updateMany({ where: { id, stage: app.stage }, data: data as Prisma.ApplicationUpdateManyMutationInput });
    if (updated.count === 0) throw new AppError(409, 'CONFLICT', 'This application was just updated by someone else. Please reload.');

    // Link the decision to the AI suggestion it was made with (measures usefulness and overrides).
    const meta: Record<string, unknown> = {};
    if (input.ai) {
      const run = await tx.aiRun.findUnique({ where: { id: input.ai.runId } });
      if (run && run.applicationId === id && run.userId === user.id) {
        await tx.aiRun.update({ where: { id: run.id }, data: { feedback: input.ai.feedback } });
        meta.aiRunId = run.id;
        meta.aiFeedback = input.ai.feedback;
        if (run.kind === 'CASE_BRIEF') {
          const suggested = (run.output as { suggestedDecision?: string }).suggestedDecision;
          meta.aiSuggestedDecision = suggested;
          meta.agreedWithAi = suggested === input.action;
        }
      }
    }
    if (input.report?.verifiedIncome !== undefined) meta.verifiedIncome = input.report.verifiedIncome;
    if (input.report?.recommendation) meta.recommendation = input.report.recommendation;

    await tx.auditEvent.create({
      data: {
        applicationId: id,
        actorId: user.id,
        action: AUDIT_FOR[input.action],
        fromStage: app.stage,
        toStage: next,
        comment: input.reason || input.report?.notes || null,
        meta: Object.keys(meta).length ? (meta as Prisma.InputJsonValue) : undefined,
      },
    });

    return { stage: next };
  });
}
