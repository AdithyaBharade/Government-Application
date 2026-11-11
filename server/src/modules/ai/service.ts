import type { AiKind, Prisma, Stage } from '@prisma/client';
import type { Part } from '@google/genai';
import { prisma } from '../../lib/prisma';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';
import { ownerOf } from '../workflow/engine';
import { getFile } from '../documents/storage';
import { missingDocuments } from '../applications/rules';
import { generateJson } from './gemini';
import {
  caseBriefPrompt,
  caseBriefSchema,
  documentCheckPrompt,
  documentCheckSchema,
  fieldChecklistPrompt,
  fieldChecklistSchema,
  reportDraftPrompt,
  reportDraftSchema,
  systemInstruction,
  type CaseBriefOutput,
  type DocumentCheckOutput,
  type FieldChecklistOutput,
  type ReportDraftOutput,
} from './prompts';

/** Types Gemini can read inline. */
const READABLE_MIME = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/;
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

async function loadCase(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: {
        select: { id: true, type: true, mimeType: true, originalName: true, size: true, storage: true, storageKey: true, data: true, extracted: true },
        orderBy: { createdAt: 'asc' },
      },
      reports: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!app) throw notFound('Application');
  return app;
}

type LoadedCase = Awaited<ReturnType<typeof loadCase>>;

/** The parts of the application the model needs. Mobile number and Aadhaar digits are never sent. */
function formFacts(app: LoadedCase) {
  return {
    appNo: app.appNo,
    applicantName: app.applicantName,
    applicantNameLocal: app.applicantNameLocal,
    relationName: app.relationName,
    gender: app.gender,
    address: `${app.address}, ${app.village}, ${app.hobli} hobli, ${app.taluk} taluk, ${app.district}`,
    occupation: app.occupation,
    purpose: app.purpose,
    declaredAnnualIncome: app.declaredIncome,
    incomeSources: app.incomeSources,
    landAcres: app.landAcres,
    familySize: app.familySize,
  };
}

function caseContext(app: LoadedCase) {
  return {
    form: formFacts(app),
    flags: app.flags,
    returnCount: app.returnCount,
    lastReturnReason: app.lastReturnReason,
    documents: app.documents.map((d) => ({ type: d.type, extracted: d.extracted })),
    officerReports: app.reports.map((r) => ({
      stage: r.stage,
      byRole: r.author.role,
      recommendation: r.recommendation,
      verifiedIncome: r.verifiedIncome,
      notes: r.notes,
    })),
  };
}

function assertOwner(app: { stage: Stage }, user: AuthUser) {
  if (ownerOf(app.stage) !== user.role) throw forbidden('This application is not in your queue');
}

async function record<T>(
  app: { id: string; stage: Stage },
  user: AuthUser,
  kind: AiKind,
  lang: string,
  result: { data: T; latencyMs: number; model: string },
) {
  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.aiRun.create({
      data: {
        applicationId: app.id,
        stage: app.stage,
        kind,
        lang,
        model: result.model,
        latencyMs: result.latencyMs,
        output: result.data as Prisma.InputJsonValue,
        userId: user.id,
      },
    });
    await tx.auditEvent.create({
      data: { applicationId: app.id, actorId: user.id, action: 'AI_ASSIST', meta: { kind, aiRunId: created.id } },
    });
    return created;
  });
  return { id: run.id, kind, createdAt: run.createdAt, latencyMs: run.latencyMs, output: result.data };
}

// ---------------------------------------------------------------------------

export async function documentCheck(applicationId: string, user: AuthUser, lang: string) {
  const app = await loadCase(applicationId);
  assertOwner(app, user);

  const readable = app.documents.filter((d) => READABLE_MIME.test(d.mimeType) && d.type !== 'FIELD_PHOTO');
  if (readable.length === 0) throw badRequest('Upload at least one document (PDF or photo) first');

  const parts: Part[] = [];
  let total = 0;
  const docList: Array<{ documentId: string; type: string; fileName: string }> = [];
  for (const d of readable) {
    if (total + d.size > MAX_INLINE_BYTES) break;
    const bytes = await getFile(d);
    total += d.size;
    parts.push({ inlineData: { mimeType: d.mimeType, data: bytes.toString('base64') } });
    docList.push({ documentId: d.id, type: d.type, fileName: d.originalName });
  }
  const missing = missingDocuments(app, app.documents);
  parts.push({ text: documentCheckPrompt(formFacts(app), docList, missing) });

  const result = await generateJson<DocumentCheckOutput>(parts, documentCheckSchema, systemInstruction(lang));

  // Rules first: a required document that is missing is a fact, not an AI opinion.
  const flags = new Set(result.data.flags);
  if (missing.length) flags.add('MISSING_DOCUMENT');
  for (const m of missing) {
    if (!result.data.checks.some((c) => c.status === 'MISSING' && c.item.toUpperCase().includes(m))) {
      result.data.checks.unshift({ item: m, status: 'MISSING', detail: 'Required document not uploaded' });
    }
  }
  result.data.flags = [...flags];

  // Keep what was read on each document so later stages (and the DT brief) can reuse it.
  await prisma.$transaction([
    ...result.data.documents
      .filter((x) => docList.some((d) => d.documentId === x.documentId))
      .map((x) =>
        prisma.document.update({ where: { id: x.documentId }, data: { extracted: x as unknown as Prisma.InputJsonValue } }),
      ),
    prisma.application.update({ where: { id: app.id }, data: { flags: result.data.flags } }),
  ]);

  return record(app, user, 'DOCUMENT_CHECK', lang, result);
}

export async function fieldChecklist(applicationId: string, user: AuthUser, lang: string) {
  const app = await loadCase(applicationId);
  assertOwner(app, user);
  const result = await generateJson<FieldChecklistOutput>(
    [{ text: fieldChecklistPrompt(caseContext(app)) }],
    fieldChecklistSchema,
    systemInstruction(lang),
  );
  return record(app, user, 'FIELD_CHECKLIST', lang, result);
}

export async function reportDraft(applicationId: string, user: AuthUser, lang: string, notes: string) {
  if (notes.trim().length < 15) throw badRequest('Write a few lines of field notes first');
  const app = await loadCase(applicationId);
  assertOwner(app, user);
  const result = await generateJson<ReportDraftOutput>(
    [{ text: reportDraftPrompt(caseContext(app), notes) }],
    reportDraftSchema,
    systemInstruction(lang),
  );
  return record(app, user, 'REPORT_DRAFT', lang, result);
}

export async function caseBrief(applicationId: string, user: AuthUser, lang: string) {
  const app = await loadCase(applicationId);
  assertOwner(app, user);
  const result = await generateJson<CaseBriefOutput>(
    [{ text: caseBriefPrompt(caseContext(app)) }],
    caseBriefSchema,
    systemInstruction(lang),
  );
  return record(app, user, 'CASE_BRIEF', lang, result);
}

export async function setFeedback(aiRunId: string, user: AuthUser, feedback: 'ACCEPTED' | 'EDITED' | 'DISMISSED') {
  const run = await prisma.aiRun.findUnique({ where: { id: aiRunId } });
  if (!run) throw notFound('AI run');
  if (run.userId !== user.id) throw forbidden();
  await prisma.aiRun.update({ where: { id: aiRunId }, data: { feedback } });
}
