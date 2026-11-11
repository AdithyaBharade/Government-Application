import { describe, expect, it } from 'vitest';
import { allowedActions, computePriority, resolveTransition, WorkflowError } from './engine';

const reason = 'Documents verified and found correct';

describe('resolveTransition', () => {
  it('moves VA -> RI on forward with a report', () => {
    expect(resolveTransition({ stage: 'VA_VERIFICATION', role: 'VA', action: 'FORWARD', hasReport: true })).toBe(
      'RI_VERIFICATION',
    );
  });

  it('blocks forward without a report', () => {
    expect(() => resolveTransition({ stage: 'VA_VERIFICATION', role: 'VA', action: 'FORWARD' })).toThrow(
      WorkflowError,
    );
  });

  it('blocks officers acting on files outside their queue', () => {
    expect(() =>
      resolveTransition({ stage: 'DT_DECISION', role: 'VA', action: 'APPROVE', reason }),
    ).toThrowError(/not in your queue/);
  });

  it('only the Deputy Tahsildar can approve or reject', () => {
    expect(allowedActions('RI_VERIFICATION', 'RI').map((a) => a.action)).not.toContain('APPROVE');
    expect(resolveTransition({ stage: 'DT_DECISION', role: 'DT', action: 'APPROVE', reason })).toBe('APPROVED');
    expect(resolveTransition({ stage: 'DT_DECISION', role: 'DT', action: 'REJECT', reason })).toBe('REJECTED');
  });

  it('requires a reason to return or reject', () => {
    expect(() => resolveTransition({ stage: 'DT_DECISION', role: 'DT', action: 'REJECT', reason: 'no' })).toThrow(
      /reason/,
    );
  });

  it('DT can return to RI (default) or VA, but not to the applicant', () => {
    expect(resolveTransition({ stage: 'DT_DECISION', role: 'DT', action: 'RETURN', reason })).toBe('RI_VERIFICATION');
    expect(
      resolveTransition({ stage: 'DT_DECISION', role: 'DT', action: 'RETURN', reason, target: 'VA_VERIFICATION' }),
    ).toBe('VA_VERIFICATION');
    expect(() =>
      resolveTransition({ stage: 'DT_DECISION', role: 'DT', action: 'RETURN', reason, target: 'RETURNED_TO_APPLICANT' }),
    ).toThrow(WorkflowError);
  });

  it('closed applications allow nothing', () => {
    expect(allowedActions('APPROVED', 'DT')).toEqual([]);
  });

  it('operator resubmits a returned application to VA', () => {
    expect(resolveTransition({ stage: 'RETURNED_TO_APPLICANT', role: 'OPERATOR', action: 'RESUBMIT' })).toBe(
      'VA_VERIFICATION',
    );
  });
});

describe('computePriority', () => {
  const now = new Date('2026-11-11T10:00:00Z');
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
  const base = { stage: 'VA_VERIFICATION' as const, returnCount: 0, flags: [], stageEnteredAt: now };

  it('ranks overdue above due-soon above on-track', () => {
    const overdue = computePriority({ ...base, dueAt: days(-2) }, now);
    const soon = computePriority({ ...base, dueAt: days(2) }, now);
    const fine = computePriority({ ...base, dueAt: days(15) }, now);
    expect(overdue.sla).toBe('OVERDUE');
    expect(soon.sla).toBe('DUE_SOON');
    expect(fine.sla).toBe('ON_TRACK');
    expect(overdue.score).toBeGreaterThan(soon.score);
    expect(soon.score).toBeGreaterThan(fine.score);
  });

  it('boosts returned and flagged files and explains why', () => {
    const p = computePriority({ ...base, dueAt: days(15), returnCount: 1, flags: ['INCOME_MISMATCH'] }, now);
    expect(p.reasons).toEqual(expect.arrayContaining(['RETURNED', 'AI_FLAGS']));
    expect(p.score).toBeGreaterThan(computePriority({ ...base, dueAt: days(15) }, now).score);
  });

  it('closed files have zero priority', () => {
    expect(computePriority({ ...base, stage: 'APPROVED', dueAt: days(-5) }, now).sla).toBe('CLOSED');
  });
});
