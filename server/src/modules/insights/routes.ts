/**
 * Impact metrics – the numbers we would track to prove the tool helps:
 * speed (days to decision, time per desk), reliability (SLA compliance, return rate)
 * and AI usefulness (how often officers accept / edit / dismiss suggestions, and agree with them).
 */
import { Router } from 'express';
import type { Stage } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { computePriority, isActiveStage } from '../workflow/engine';

export const insightsRouter = Router();
insightsRouter.use(requireAuth);

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

insightsRouter.get(
  '/insights',
  asyncHandler(async (_req, res) => {
    const [apps, events, aiRuns] = await Promise.all([
      prisma.application.findMany({
        select: { id: true, stage: true, receivedAt: true, dueAt: true, decidedAt: true, returnCount: true, flags: true, stageEnteredAt: true },
      }),
      prisma.auditEvent.findMany({
        where: { action: { in: ['CREATED', 'FORWARDED', 'RETURNED', 'RESUBMITTED', 'APPROVED', 'REJECTED'] } },
        select: { applicationId: true, action: true, fromStage: true, createdAt: true, meta: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.aiRun.findMany({ select: { kind: true, feedback: true, latencyMs: true } }),
    ]);

    const now = new Date();
    const active = apps.filter((a) => isActiveStage(a.stage));
    const decided = apps.filter((a) => a.decidedAt);

    // Time spent at each desk, reconstructed from the audit trail
    const stageDays: Partial<Record<Stage, number[]>> = {};
    const enteredAt = new Map<string, Date>();
    for (const e of events) {
      if (e.fromStage && enteredAt.has(e.applicationId)) {
        const d = (e.createdAt.getTime() - enteredAt.get(e.applicationId)!.getTime()) / DAY;
        (stageDays[e.fromStage] ??= []).push(d);
      }
      enteredAt.set(e.applicationId, e.createdAt);
    }

    // Weekly trend for the last 6 weeks
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const end = new Date(now.getTime() - (5 - i) * 7 * DAY);
      const start = new Date(end.getTime() - 7 * DAY);
      return {
        weekEnding: end.toISOString().slice(0, 10),
        received: apps.filter((a) => a.receivedAt > start && a.receivedAt <= end).length,
        decided: decided.filter((a) => a.decidedAt! > start && a.decidedAt! <= end).length,
      };
    });

    const aiByKind: Record<string, { runs: number; accepted: number; edited: number; dismissed: number; avgLatencyMs: number | null }> = {};
    for (const r of aiRuns) {
      const k = (aiByKind[r.kind] ??= { runs: 0, accepted: 0, edited: 0, dismissed: 0, avgLatencyMs: 0 });
      k.runs += 1;
      if (r.feedback === 'ACCEPTED') k.accepted += 1;
      if (r.feedback === 'EDITED') k.edited += 1;
      if (r.feedback === 'DISMISSED') k.dismissed += 1;
      k.avgLatencyMs = (k.avgLatencyMs ?? 0) + r.latencyMs;
    }
    for (const k of Object.values(aiByKind)) k.avgLatencyMs = k.runs ? Math.round(k.avgLatencyMs! / k.runs) : null;

    const decisionsWithAi = events.filter(
      (e) => (e.action === 'APPROVED' || e.action === 'REJECTED') && (e.meta as { agreedWithAi?: boolean } | null)?.agreedWithAi !== undefined,
    );
    const withFeedback = aiRuns.filter((r) => r.feedback);

    res.json({
      generatedAt: now,
      pending: {
        total: active.length,
        overdue: active.filter((a) => computePriority(a, now).sla === 'OVERDUE').length,
        dueSoon: active.filter((a) => computePriority(a, now).sla === 'DUE_SOON').length,
        byStage: Object.fromEntries(
          ['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT'].map((s) => [s, active.filter((a) => a.stage === s).length]),
        ),
      },
      decided: {
        total: decided.length,
        approved: decided.filter((a) => a.stage === 'APPROVED').length,
        rejected: decided.filter((a) => a.stage === 'REJECTED').length,
        withinSlaPct: decided.length ? Math.round((100 * decided.filter((a) => a.decidedAt! <= a.dueAt).length) / decided.length) : null,
        avgDaysToDecision: round1(avg(decided.map((a) => (a.decidedAt!.getTime() - a.receivedAt.getTime()) / DAY)) ?? 0),
        returnRatePct: decided.length ? Math.round((100 * decided.filter((a) => a.returnCount > 0).length) / decided.length) : null,
      },
      avgDaysAtStage: Object.fromEntries(Object.entries(stageDays).map(([s, xs]) => [s, round1(avg(xs) ?? 0)])),
      weeks,
      ai: {
        totalRuns: aiRuns.length,
        usefulPct: withFeedback.length
          ? Math.round((100 * withFeedback.filter((r) => r.feedback !== 'DISMISSED').length) / withFeedback.length)
          : null,
        byKind: aiByKind,
        decisionAgreementPct: decisionsWithAi.length
          ? Math.round((100 * decisionsWithAi.filter((e) => (e.meta as { agreedWithAi: boolean }).agreedWithAi).length) / decisionsWithAi.length)
          : null,
      },
    });
  }),
);
