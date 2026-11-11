export type Role = 'OPERATOR' | 'VA' | 'RI' | 'DT';
export type Stage = 'VA_VERIFICATION' | 'RI_VERIFICATION' | 'DT_DECISION' | 'RETURNED_TO_APPLICANT' | 'APPROVED' | 'REJECTED';
export type DocType = 'AADHAAR' | 'RATION_CARD' | 'SELF_DECLARATION' | 'SALARY_CERTIFICATE' | 'RTC' | 'FIELD_PHOTO' | 'OTHER';
export type WorkflowAction = 'FORWARD' | 'RETURN' | 'APPROVE' | 'REJECT' | 'RESUBMIT';
export type SlaStatus = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'CLOSED';
export type AiKind = 'DOCUMENT_CHECK' | 'FIELD_CHECKLIST' | 'REPORT_DRAFT' | 'CASE_BRIEF';
export type AiFeedback = 'ACCEPTED' | 'EDITED' | 'DISMISSED';

export interface User {
  id: string;
  username: string;
  name: string;
  nameLocal: string;
  role: Role;
  office: string;
}

export interface Priority {
  score: number;
  sla: SlaStatus;
  daysLeft: number;
  daysInStage: number;
  reasons: string[];
}

export interface ApplicationSummary {
  id: string;
  appNo: string;
  applicantName: string;
  applicantNameLocal: string | null;
  village: string;
  purpose: string;
  declaredIncome: number;
  stage: Stage;
  receivedAt: string;
  dueAt: string;
  returnCount: number;
  lastReturnReason: string | null;
  flags: string[];
  decidedAt: string | null;
  priority: Priority;
}

export interface DashboardSummary {
  byStage: Partial<Record<Stage, number>>;
  queue: { total: number; overdue: number; dueSoon: number; returned: number; flagged: number };
  top: ApplicationSummary[];
}

export interface Person { name: string; nameLocal?: string; role: Role }

export interface DocumentInfo {
  id: string;
  type: DocType;
  originalName: string;
  mimeType: string;
  size: number;
  extracted: Record<string, unknown> | null;
  createdAt: string;
  uploadedBy: Person;
}

export interface StageReport {
  id: string;
  stage: Stage;
  notes: string;
  verifiedIncome: number | null;
  recommendation: 'APPROVE' | 'REJECT' | null;
  checklist: Record<string, boolean> | null;
  createdAt: string;
  author: Person;
}

export interface AuditEvent {
  id: string;
  action: 'CREATED' | 'DOCUMENT_UPLOADED' | 'AI_ASSIST' | 'FORWARDED' | 'RETURNED' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED';
  fromStage: Stage | null;
  toStage: Stage | null;
  comment: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: Person | null;
}

export interface AiRun<T = unknown> {
  id: string;
  kind: AiKind;
  output: T;
  feedback: AiFeedback | null;
  latencyMs: number;
  createdAt: string;
}

export interface ApplicationDetail extends Omit<ApplicationSummary, 'priority'> {
  relationName: string;
  gender: 'M' | 'F' | 'O';
  mobile: string;
  aadhaarLast4: string;
  address: string;
  hobli: string;
  taluk: string;
  district: string;
  occupation: string;
  incomeSources: { agriculture: number; salary: number; business: number; other: number };
  landAcres: number | null;
  familySize: number;
  verifiedIncome: number | null;
  certificateNo: string | null;
  decisionReason: string | null;
  documents: DocumentInfo[];
  reports: StageReport[];
  events: AuditEvent[];
  latestAi: Partial<Record<AiKind, AiRun>>;
  priority: Priority;
  owner: Role | null;
  allowedActions: Array<{ action: WorkflowAction; targets: Stage[] }>;
  requiredDocuments: DocType[];
  missingDocuments: DocType[];
}

// ---- AI outputs ----
export type CheckStatus = 'OK' | 'MISMATCH' | 'MISSING' | 'UNCLEAR';

export interface DocumentCheck {
  documents: Array<{ documentId: string; readable: boolean; nameOnDocument?: string | null; annualIncome?: number | null; rationCardType?: string | null; landAcres?: number | null; summary: string }>;
  checks: Array<{ item: string; status: CheckStatus; detail: string }>;
  flags: string[];
  estimatedAnnualIncome?: number | null;
  suggestedRemarks: string;
  suggestedAction: 'FORWARD' | 'RETURN';
}

export interface FieldChecklist {
  focusPoints: Array<{ point: string; why: string }>;
  questionsToAsk: string[];
  thingsToSee: string[];
}

export interface ReportDraft {
  report: string;
  verifiedAnnualIncome?: number | null;
  incomeBreakdown: string;
  recommendation: 'APPROVE' | 'REJECT' | 'UNCLEAR';
  missingInfo: string[];
}

export interface CaseBrief {
  summary: string;
  incomeComparison: Array<{ source: string; amount?: number | null }>;
  risks: string[];
  suggestedDecision: 'APPROVE' | 'REJECT' | 'RETURN';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale: string;
  draftReason: string;
  incomeForCertificate?: number | null;
}

export interface Insights {
  pending: { total: number; overdue: number; dueSoon: number; byStage: Record<string, number> };
  decided: { total: number; approved: number; rejected: number; withinSlaPct: number | null; avgDaysToDecision: number; returnRatePct: number | null };
  avgDaysAtStage: Partial<Record<Stage, number>>;
  weeks: Array<{ weekEnding: string; received: number; decided: number }>;
  ai: {
    totalRuns: number;
    usefulPct: number | null;
    decisionAgreementPct: number | null;
    byKind: Partial<Record<AiKind, { runs: number; accepted: number; edited: number; dismissed: number; avgLatencyMs: number | null }>>;
  };
}

export interface ActionPayload {
  action: WorkflowAction;
  target?: Stage;
  reason?: string;
  report?: { notes: string; verifiedIncome?: number; recommendation?: 'APPROVE' | 'REJECT'; checklist?: Record<string, boolean> };
  certificateIncome?: number;
  ai?: { runId: string; feedback: AiFeedback };
}
