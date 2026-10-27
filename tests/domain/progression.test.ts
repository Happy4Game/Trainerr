import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REP_RANGES,
  REST_SECONDS,
  firstTimeProposal,
  nextSessionProposal,
  nextSetProposal,
  repRangeFor,
  validRepRange,
} from '@/domain/progression';
import type { Difficulty, SetLog } from '@/domain/types';
import { dumbbellSteps, ex, stackSteps } from '../fixtures/exercises';

const heavy = DEFAULT_REP_RANGES.heavyCompound; // 8-10
const machine = DEFAULT_REP_RANGES.machineCompound; // 10-12
const isolation = DEFAULT_REP_RANGES.isolation; // 12-15

function set(
  loadKg: number,
  reps: number,
  difficulty: Difficulty = 'ok',
  extra: Partial<SetLog> = {},
) {
  return { exerciseId: 'x', loadKg, reps, difficulty, ...extra };
}

describe('rep ranges and rest', () => {
  it('follow the exercise kind', () => {
    expect(heavy).toEqual({ min: 8, max: 10 });
    expect(machine).toEqual({ min: 10, max: 12 });
    expect(isolation).toEqual({ min: 12, max: 15 });
    expect(REST_SECONDS.heavyCompound).toEqual({ min: 120, max: 180 });
    expect(REST_SECONDS.machineCompound).toEqual({ min: 90, max: 120 });
    expect(REST_SECONDS.isolation).toEqual({ min: 60, max: 90 });
  });

  it('can be overridden per exercise', () => {
    expect(repRangeFor(ex.pecFly)).toEqual(isolation);
    expect(repRangeFor(ex.legExtension)).toEqual({ min: 8, max: 10 });
  });
});

describe('between two sets', () => {
  // Dumbbells (2 kg steps) for the basic rules; the 7 kg stack is a "missing step" case.
  const next = (s: SetLog, range = heavy, isLastSet = false, steps = dumbbellSteps) =>
    nextSetProposal({ set: s, range, steps, isLastSet });

  it('rule 1: reps above the range → one step up', () => {
    expect(next(set(16, 11))).toMatchObject({
      action: 'increase',
      loadKg: 18,
      reason: 'aboveRange',
    });
  });

  it('rule 1: Easy → one step up, even inside the range', () => {
    expect(next(set(16, 9, 'easy'))).toMatchObject({
      action: 'increase',
      loadKg: 18,
      reason: 'easy',
    });
  });

  it('a heavier load aims at the bottom of the range', () => {
    expect(next(set(16, 11)).targetReps).toBe(8);
  });

  it('rule 2: reps in range, Correct or Limite → same load, aim for the top', () => {
    expect(next(set(16, 8, 'ok'))).toMatchObject({ action: 'keep', loadKg: 16, targetReps: 10 });
    expect(next(set(16, 10, 'hard'))).toMatchObject({ action: 'keep', loadKg: 16 });
  });

  it('never increases on Limite, even above the range', () => {
    expect(next(set(16, 12, 'hard'))).toMatchObject({ action: 'keep', loadKg: 16, reason: 'hard' });
  });

  it('rule 3: reps below the range → one step down', () => {
    expect(next(set(16, 7))).toMatchObject({
      action: 'decrease',
      loadKg: 14,
      reason: 'belowRange',
    });
  });

  it('rule 3: Échec → one step down', () => {
    expect(next(set(16, 9, 'fail'))).toMatchObject({
      action: 'decrease',
      loadKg: 14,
      reason: 'failure',
    });
  });

  it('rule 3: on the last set, a decrease means stopping the exercise', () => {
    expect(next(set(16, 7), heavy, true)).toMatchObject({ action: 'stop', reason: 'belowRange' });
  });

  it('stops when there is no lighter step', () => {
    expect(next(set(2, 6))).toMatchObject({ action: 'stop', loadKg: 2, reason: 'belowRange' });
  });

  it('rule 4: incomplete reps do not count → step down and range-of-motion reminder', () => {
    expect(next(set(16, 10, 'ok', { completeReps: false }))).toMatchObject({
      action: 'decrease',
      loadKg: 14,
      reason: 'incompleteReps',
      reminders: ['rangeOfMotion'],
    });
  });

  it('keeps the heaviest step when there is nothing above', () => {
    expect(next(set(40, 12))).toMatchObject({
      action: 'keep',
      loadKg: 40,
      reason: 'noHeavierStep',
    });
  });

  it('missing step: stays on the lower step and stretches the range by 3 reps first', () => {
    // Pec fly 52 × 16: the next step (59) is +13.5 %.
    expect(next(set(52, 16), isolation, false, stackSteps)).toMatchObject({
      action: 'keep',
      loadKg: 52,
      targetReps: 18,
      reason: 'missingStep',
    });
    expect(next(set(52, 18), isolation, false, stackSteps)).toMatchObject({
      action: 'increase',
      loadKg: 59,
    });
  });

  it('a small absolute jump is not a missing step (dumbbells 16 → 18 kg)', () => {
    expect(
      nextSetProposal({ set: set(16, 11), range: heavy, steps: dumbbellSteps, isLastSet: false }),
    ).toMatchObject({ action: 'increase', loadKg: 18 });
  });

  describe('properties', () => {
    const difficulty = fc.constantFrom<Difficulty>('easy', 'ok', 'hard', 'fail');
    const steps = fc
      .uniqueArray(fc.integer({ min: 1, max: 200 }), { minLength: 2, maxLength: 30 })
      .map((values) => [...values].sort((a, b) => a - b));
    const input = fc.record({
      steps,
      stepIndex: fc.nat(),
      reps: fc.integer({ min: 0, max: 60 }).map((n) => n / 2),
      difficulty,
      complete: fc.boolean(),
      min: fc.integer({ min: 4, max: 15 }),
      width: fc.integer({ min: 0, max: 5 }),
      isLastSet: fc.boolean(),
    });

    it('always proposes a load that exists on the machine', () => {
      fc.assert(
        fc.property(input, (i) => {
          const loadKg = i.steps[i.stepIndex % i.steps.length] as number;
          const proposal = nextSetProposal({
            set: set(loadKg, i.reps, i.difficulty, { completeReps: i.complete }),
            range: { min: i.min, max: i.min + i.width },
            steps: i.steps,
            isLastSet: i.isLastSet,
          });
          expect(i.steps).toContain(proposal.loadKg);
        }),
      );
    });

    it('never increases the load after Limite or Échec', () => {
      fc.assert(
        fc.property(input, fc.constantFrom<Difficulty>('hard', 'fail'), (i, hardOrFail) => {
          const loadKg = i.steps[i.stepIndex % i.steps.length] as number;
          const proposal = nextSetProposal({
            set: set(loadKg, i.reps, hardOrFail, { completeReps: i.complete }),
            range: { min: i.min, max: i.min + i.width },
            steps: i.steps,
            isLastSet: i.isLastSet,
          });
          expect(proposal.loadKg).toBeLessThanOrEqual(loadKg);
        }),
      );
    });
  });
});

describe('between two sessions', () => {
  const next = (history: SetLog[][], range = heavy, steps = dumbbellSteps) =>
    nextSessionProposal({ history, range, steps });

  it('rule 1: every work set at the top of the range → one step up', () => {
    expect(next([[set(16, 10), set(16, 10), set(16, 11)]])).toMatchObject({
      loadKg: 18,
      targetReps: 8,
      reason: 'allSetsAtTop',
    });
  });

  it('ignores warm-up sets', () => {
    expect(next([[set(8, 15, 'easy', { warmup: true }), set(16, 10), set(16, 10)]])).toMatchObject({
      loadKg: 18,
    });
  });

  it('rule 2: load raised during the session and held → new starting load', () => {
    expect(next([[set(14, 11), set(16, 9), set(16, 8, 'hard')]])).toMatchObject({
      loadKg: 16,
      targetReps: 10,
      reason: 'raisedAndHeld',
    });
  });

  it('otherwise keeps the load that was held, aiming for the top', () => {
    expect(next([[set(16, 9), set(16, 8, 'hard')]])).toMatchObject({
      loadKg: 16,
      targetReps: 10,
      reason: 'keep',
    });
  });

  it('a raised load that failed is not the new start', () => {
    expect(next([[set(14, 10), set(16, 6, 'fail')]])).toMatchObject({ loadKg: 14 });
  });

  it('rule 3: failure two sessions in a row → one step down and technique reminder', () => {
    const failed = [set(16, 9), set(16, 6, 'fail')];
    expect(next([failed, failed])).toMatchObject({
      loadKg: 14,
      reason: 'repeatedFailure',
      reminders: ['technique'],
    });
  });

  it('one failed session alone does not lower the start', () => {
    expect(next([[set(16, 9)], [set(16, 9), set(16, 6, 'fail')]])).toMatchObject({ loadKg: 16 });
  });

  it('missing step between sessions: stretch the range by 3 reps before jumping', () => {
    const steps = stackSteps;
    expect(next([[set(52, 15), set(52, 15)]], isolation, steps)).toMatchObject({
      loadKg: 52,
      targetReps: 18,
      reason: 'missingStep',
    });
    expect(next([[set(52, 18), set(52, 18)]], isolation, steps)).toMatchObject({ loadKg: 59 });
  });

  it('without history, there is nothing to propose', () => {
    expect(next([])).toBeUndefined();
    expect(next([[set(20, 15, 'easy', { warmup: true })]])).toBeUndefined();
  });
});

describe('first time on a machine', () => {
  it('starts with a light test set on the lightest step', () => {
    expect(firstTimeProposal({ range: isolation, steps: stackSteps })).toEqual({
      loadKg: 25,
      targetReps: 15,
      testSet: true,
    });
  });

  it('uses the user estimate, rounded down to a step', () => {
    expect(
      firstTimeProposal({ range: isolation, steps: stackSteps, estimateKg: 50 }),
    ).toMatchObject({
      loadKg: 45,
    });
  });
});

describe('own rep range', () => {
  const machine = { kind: 'machineCompound' } as Parameters<typeof repRangeFor>[0];

  it('replaces the range of every exercise when set', () => {
    expect(repRangeFor(machine)).toEqual({ min: 10, max: 12 });
    expect(repRangeFor(machine, { min: 8, max: 12 })).toEqual({ min: 8, max: 12 });
  });

  it('stays between 1 and 30 reps, at least 2 reps wide', () => {
    expect(validRepRange({ min: 8, max: 12 })).toBe(true);
    expect(validRepRange({ min: 8, max: 9 })).toBe(false);
    expect(validRepRange({ min: 0, max: 12 })).toBe(false);
    expect(validRepRange({ min: 20, max: 31 })).toBe(false);
    expect(validRepRange({ min: 8.5, max: 12 })).toBe(false);
  });
});
