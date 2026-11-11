/**
 * Workflow rules for an income certificate at a Nadakacheri.
 *
 *   Operator registers ──► VA verifies documents ──► RI verifies in the field ──► DT decides
 *                              │                         │                        │  ├─ APPROVE
 *        RETURNED_TO_APPLICANT ◄┘                         │                        │  └─ REJECT
 *              │ (operator resubmits)    VA_VERIFICATION ◄┘   RI / VA ◄── RETURN ──┘
 *              └──────────────► VA_VERIFICATION
 *
 * Pure functions only – no database access – so the rules are easy to read and test.
 */
import type { Role, Stage } from '@prisma/client';

export type WorkflowAction = 'FORWARD' | 'RETURN' | 'APPROVE' | 'REJECT' | 'RESUBMIT';

export const ACTIVE_STAGES = ['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION', 'RETURNED_TO_APPLICANT'] as const;
export type ActiveStage = (typeof ACTIVE_STAGES)[number];

/** Which role owns (works on) an application at each active stage. */
export const STAGE_OWNER: Record<ActiveStage, Role> = {
  VA_VERIFICATION: 'VA',
  RI_VERIFICATION: 'RI',
  DT_DECISION: 'DT',
  RETURNED_TO_APPLICANT: 'OPERATOR',
};

/** Allowed actions per stage and the stages each action can lead to. */
const TRANSITIONS: Record<Stage, Partial<Record<WorkflowAction, Stage[]>>> = {
  VA_VERIFICATION: { FORWARD: ['RI_VERIFICATION'], RETURN: ['RETURNED_TO_APPLICANT'] },
  RI_VERIFICATION: { FORWARD: ['DT_DECISION'], RETURN: ['VA_VERIFICATION'] },
  DT_DECISION: {
    APPROVE: ['APPROVED'],
    REJECT: ['REJECTED'],
    RETURN: ['RI_VERIFICATION', 'VA_VERIFICATION'],
  },
  RETURNED_TO_APPLICANT: { RESUBMIT: ['VA_VERIFICATION'] },
  APPROVED: {},
  REJECTED: {},
};

/** Actions that must carry a written reason from the officer. */
export const REASON_REQUIRED: ReadonlySet<WorkflowAction> = new Set(['RETURN', 'REJECT', 'APPROVE']);
/** Actions that must carry the officer's stage report. */
export const REPORT_REQUIRED: ReadonlySet<WorkflowAction> = new Set(['FORWARD']);
export const MIN_REASON_LENGTH = 10;

export class WorkflowError extends Error {
  constructor(
    public code: 'NOT_OWNER' | 'INVALID_ACTION' | 'INVALID_TARGET' | 'REASON_REQUIRED' | 'REPORT_REQUIRED',
    message: string,
  ) {
    super(message);
  }
}

export const isActiveStage = (stage: Stage): stage is ActiveStage =>
  (ACTIVE_STAGES as readonly string[]).includes(stage);

export const ownerOf = (stage: Stage): Role | null => (isActiveStage(stage) ? STAGE_OWNER[stage] : null);

export interface AllowedAction {
  action: WorkflowAction;
  targets: Stage[];
}

export function allowedActions(stage: Stage, role: Role): AllowedAction[] {
  if (ownerOf(stage) !== role) return [];
  return Object.entries(TRANSITIONS[stage]).map(([action, targets]) => ({
    action: action as WorkflowAction,
    targets: targets ?? [],
  }));
}

export interface TransitionInput {
  stage: Stage;
  role: Role;
  action: WorkflowAction;
  target?: Stage;
  reason?: string;
  hasReport?: boolean;
}

/** Validates a requested move and returns the next stage. Throws WorkflowError if not allowed. */
export function resolveTransition(input: TransitionInput): Stage {
  const { stage, role, action, target, reason, hasReport } = input;

  if (ownerOf(stage) !== role) {
    throw new WorkflowError('NOT_OWNER', 'This application is not in your queue');
  }
  const targets = TRANSITIONS[stage][action];
  if (!targets || targets.length === 0) {
    throw new WorkflowError('INVALID_ACTION', `${action} is not possible at ${stage}`);
  }
  const next = target ?? targets[0];
  if (!targets.includes(next)) {
    throw new WorkflowError('INVALID_TARGET', `Cannot ${action} to ${next}`);
  }
  if (REASON_REQUIRED.has(action) && (reason ?? '').trim().length < MIN_REASON_LENGTH) {
    throw new WorkflowError('REASON_REQUIRED', `Please write a reason (at least ${MIN_REASON_LENGTH} characters)`);
  }
  if (REPORT_REQUIRED.has(action) && !hasReport) {
    throw new WorkflowError('REPORT_REQUIRED', 'Please complete your verification report before forwarding');
  }
  return next;
}

// ---------------------------------------------------------------------------
// Priority – "what needs attention first"
// ---------------------------------------------------------------------------

export type SlaStatus = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'CLOSED';

export interface PriorityInput {
  stage: Stage;
  dueAt: Date;
  returnCount: number;
  flags: string[];
  stageEnteredAt: Date;
}

export interface Priority {
  score: number;
  sla: SlaStatus;
  daysLeft: number;
  daysInStage: number;
  reasons: string[];
}

const DAY = 24 * 60 * 60 * 1000;
export const DUE_SOON_DAYS = 5;

/**
 * Higher score = look at it first. Deliberately simple and explainable:
 * an officer can see *why* a file is at the top (reasons[]).
 */
export function computePriority(app: PriorityInput, now: Date = new Date()): Priority {
  const daysLeft = Math.ceil((app.dueAt.getTime() - now.getTime()) / DAY);
  const daysInStage = Math.floor((now.getTime() - app.stageEnteredAt.getTime()) / DAY);

  if (!isActiveStage(app.stage)) {
    return { score: 0, sla: 'CLOSED', daysLeft, daysInStage, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 0;
  let sla: SlaStatus = 'ON_TRACK';

  if (daysLeft < 0) {
    sla = 'OVERDUE';
    score += 1000 + Math.abs(daysLeft) * 20;
    reasons.push('OVERDUE');
  } else if (daysLeft <= DUE_SOON_DAYS) {
    sla = 'DUE_SOON';
    score += 500 + (DUE_SOON_DAYS - daysLeft) * 20;
    reasons.push('DUE_SOON');
  } else {
    score += Math.max(0, 100 - daysLeft * 4);
  }

  if (app.returnCount > 0) {
    score += 150;
    reasons.push('RETURNED');
  }
  if (app.flags.length > 0) {
    score += 50 * app.flags.length;
    reasons.push('AI_FLAGS');
  }
  // Files sitting idle at one desk for long also need a nudge
  if (daysInStage >= 3) {
    score += daysInStage * 5;
    reasons.push('IDLE');
  }

  return { score, sla, daysLeft, daysInStage, reasons };
}
