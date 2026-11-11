/**
 * Prompts and response schemas for each AI assist.
 * Principle: AI reads, compares, summarises and drafts. It never decides.
 */
import { Type, type Schema } from '@google/genai';
import { LANGUAGE_NAMES } from './gemini';

export const FLAG_CODES = [
  'NAME_MISMATCH',
  'INCOME_MISMATCH',
  'ADDRESS_MISMATCH',
  'MISSING_DOCUMENT',
  'UNREADABLE_DOCUMENT',
  'BPL_INCOME_CONFLICT',
] as const;

export function systemInstruction(lang: string): string {
  const language = LANGUAGE_NAMES[lang] ?? 'English';
  return [
    'You assist revenue officers at a Nadakacheri (hobli revenue office) in Karnataka, India, who process income certificate applications.',
    'An income certificate states the total annual income of the applicant\'s family from all sources (salary, agriculture, business, other).',
    'You NEVER make the decision. You read documents, compare facts, point out inconsistencies and draft text that the officer will review and edit.',
    'Be factual. Always say which document a fact came from. If something cannot be read or is uncertain, say so instead of guessing.',
    'Useful domain facts: 1 acre = 40 guntas. A salary certificate shows monthly pay – multiply by 12 for annual income.',
    'A BPL / Antyodaya (AAY) ration card generally indicates annual family income below Rs 1,20,000; a much higher declared income is worth flagging, not concluding.',
    'Names may appear in Kannada script on one document and English on another – treat transliterations of the same name as a match.',
    `Write every free-text field in ${language}, in short, plain sentences a busy field officer can read on a phone. Keep numbers as digits. Keep application numbers, document names and money amounts readable.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// VA: document check
// ---------------------------------------------------------------------------

export const documentCheckSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    documents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          documentId: { type: Type.STRING },
          readable: { type: Type.BOOLEAN },
          nameOnDocument: { type: Type.STRING, nullable: true },
          relationName: { type: Type.STRING, nullable: true },
          address: { type: Type.STRING, nullable: true },
          annualIncome: { type: Type.NUMBER, nullable: true, description: 'Annual income in rupees if stated or derivable' },
          rationCardType: { type: Type.STRING, nullable: true, description: 'BPL, APL, AAY or PHH if a ration card' },
          landAcres: { type: Type.NUMBER, nullable: true },
          summary: { type: Type.STRING, description: 'One line: what this document shows' },
        },
        required: ['documentId', 'readable', 'summary'],
      },
    },
    checks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: 'Short label, e.g. "Name", "Income", "Address"' },
          status: { type: Type.STRING, enum: ['OK', 'MISMATCH', 'MISSING', 'UNCLEAR'] },
          detail: { type: Type.STRING },
        },
        required: ['item', 'status', 'detail'],
      },
    },
    flags: { type: Type.ARRAY, items: { type: Type.STRING, enum: [...FLAG_CODES] } },
    estimatedAnnualIncome: { type: Type.NUMBER, nullable: true },
    suggestedRemarks: { type: Type.STRING, description: 'Draft VA verification remarks, 2-4 sentences' },
    suggestedAction: { type: Type.STRING, enum: ['FORWARD', 'RETURN'] },
  },
  required: ['documents', 'checks', 'flags', 'suggestedRemarks', 'suggestedAction'],
};

export interface DocumentCheckOutput {
  documents: Array<{
    documentId: string;
    readable: boolean;
    nameOnDocument?: string | null;
    relationName?: string | null;
    address?: string | null;
    annualIncome?: number | null;
    rationCardType?: string | null;
    landAcres?: number | null;
    summary: string;
  }>;
  checks: Array<{ item: string; status: 'OK' | 'MISMATCH' | 'MISSING' | 'UNCLEAR'; detail: string }>;
  flags: string[];
  estimatedAnnualIncome?: number | null;
  suggestedRemarks: string;
  suggestedAction: 'FORWARD' | 'RETURN';
}

export function documentCheckPrompt(form: unknown, docList: unknown, missingDocs: string[]): string {
  return [
    'TASK: The Village Administrative Officer is verifying documents for this income certificate application.',
    '1. Read each attached document (they appear in the same order as DOCUMENT LIST) and extract the fields.',
    '2. Compare the documents with the APPLICATION FORM: applicant name, father/husband name, address, and income.',
    '3. Add a check for every comparison. Use MISSING for required documents that are not attached.',
    '4. Suggest remarks for the VA and whether to FORWARD to the Revenue Inspector or RETURN to the applicant (only if a required document is missing or unreadable, or a clear mismatch needs the applicant to correct it).',
    '',
    `APPLICATION FORM: ${JSON.stringify(form)}`,
    `DOCUMENT LIST: ${JSON.stringify(docList)}`,
    `REQUIRED DOCUMENTS NOT UPLOADED: ${missingDocs.length ? missingDocs.join(', ') : 'none'}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// RI: field checklist and report draft
// ---------------------------------------------------------------------------

export const fieldChecklistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    focusPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { point: { type: Type.STRING }, why: { type: Type.STRING } },
        required: ['point', 'why'],
      },
    },
    questionsToAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
    thingsToSee: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['focusPoints', 'questionsToAsk', 'thingsToSee'],
};

export interface FieldChecklistOutput {
  focusPoints: Array<{ point: string; why: string }>;
  questionsToAsk: string[];
  thingsToSee: string[];
}

export function fieldChecklistPrompt(caseContext: unknown): string {
  return [
    'TASK: The Revenue Inspector will visit the applicant\'s village to verify the declared family income.',
    'Prepare a short, case-specific field checklist (max 5 focus points, max 5 questions for the applicant/neighbours/panchayat, max 4 things to physically see).',
    'Focus on whatever is doubtful or unverified in this case (e.g. flags from document check, land holding vs agricultural income, salary vs declared income, household assets).',
    '',
    `CASE: ${JSON.stringify(caseContext)}`,
  ].join('\n');
}

export const reportDraftSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    report: { type: Type.STRING, description: 'Formal field verification report, 4-8 sentences, first person as the Revenue Inspector' },
    verifiedAnnualIncome: { type: Type.NUMBER, nullable: true },
    incomeBreakdown: { type: Type.STRING, description: 'How the annual income adds up, e.g. "Agriculture 40,000 + wages 36,000"' },
    recommendation: { type: Type.STRING, enum: ['APPROVE', 'REJECT', 'UNCLEAR'] },
    missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['report', 'incomeBreakdown', 'recommendation', 'missingInfo'],
};

export interface ReportDraftOutput {
  report: string;
  verifiedAnnualIncome?: number | null;
  incomeBreakdown: string;
  recommendation: 'APPROVE' | 'REJECT' | 'UNCLEAR';
  missingInfo: string[];
}

export function reportDraftPrompt(caseContext: unknown, notes: string): string {
  return [
    'TASK: Turn the Revenue Inspector\'s rough field notes (may be in any language, may be dictated, may be incomplete) into a formal verification report.',
    'Use ONLY facts present in the notes and the case. Do not invent visits, people or amounts. If the notes do not support a verified income figure, leave verifiedAnnualIncome empty and list what is missing.',
    '',
    `CASE: ${JSON.stringify(caseContext)}`,
    `FIELD NOTES: """${notes}"""`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// DT: case brief
// ---------------------------------------------------------------------------

export const caseBriefSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: '3-5 sentence summary of the whole file' },
    incomeComparison: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { source: { type: Type.STRING }, amount: { type: Type.NUMBER, nullable: true } },
        required: ['source'],
      },
    },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedDecision: { type: Type.STRING, enum: ['APPROVE', 'REJECT', 'RETURN'] },
    confidence: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    rationale: { type: Type.STRING },
    draftReason: { type: Type.STRING, description: 'Draft order remarks the Deputy Tahsildar can use, 1-3 sentences' },
    incomeForCertificate: { type: Type.NUMBER, nullable: true },
  },
  required: ['summary', 'incomeComparison', 'risks', 'suggestedDecision', 'confidence', 'rationale', 'draftReason'],
};

export interface CaseBriefOutput {
  summary: string;
  incomeComparison: Array<{ source: string; amount?: number | null }>;
  risks: string[];
  suggestedDecision: 'APPROVE' | 'REJECT' | 'RETURN';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale: string;
  draftReason: string;
  incomeForCertificate?: number | null;
}

export function caseBriefPrompt(caseContext: unknown): string {
  return [
    'TASK: The Deputy Tahsildar must decide this income certificate application. Prepare a decision brief.',
    'Compare income as declared by the applicant, as found in documents, as verified by the VA and as verified by the RI.',
    'Suggest APPROVE when verification reports agree and documents support the income; REJECT when evidence shows the claim is false; RETURN when information is missing or reports conflict.',
    'Officer reports may be written in different languages – read all of them.',
    'The income for the certificate should normally be the RI-verified income.',
    '',
    `CASE: ${JSON.stringify(caseContext)}`,
  ].join('\n');
}
