import { describe, expect, it } from 'vitest';
import {
  alternativesFor,
  completeExercise,
  crowdedFallback,
  endSession,
  isCrowded,
  markBusy,
  nextStep,
  previousExercise,
  reopenPrevious,
  startNow,
  startQueue,
  stillBusy,
} from '@/domain/busyMachine';
import { ex } from '../fixtures/exercises';

const loadFor = (id: string) => ({ 'chest-press': 45, 'lateral-raise': 32 })[id];

describe('alternatives when a machine is taken', () => {
  it('offers the remaining exercises of the session when no other favorite fits', () => {
    const alternatives = alternativesFor(ex.pecFly, {
      remaining: [ex.lateralRaise, ex.tricepsPushdown],
      otherFavorites: [],
      loadFor,
    });
    expect(alternatives).toEqual([
      { kind: 'swap', exercise: ex.lateralRaise, loadKg: 32 },
      { kind: 'swap', exercise: ex.tricepsPushdown },
    ]);
  });

  it('prefers another favorite working the same muscles, with its load', () => {
    const alternatives = alternativesFor(ex.pecFly, {
      remaining: [ex.lateralRaise],
      otherFavorites: [ex.chestPress, ex.legCurl],
      loadFor,
    });
    expect(alternatives[0]).toEqual({ kind: 'substitute', exercise: ex.chestPress, loadKg: 45 });
    expect(alternatives.map((a) => a.exercise.id)).not.toContain('leg-curl');
  });

  it('seated row taken → diverging seated row, then rear delt', () => {
    const alternatives = alternativesFor(ex.seatedRow, {
      remaining: [],
      otherFavorites: [ex.rearDelt, ex.divergingSeatedRow, ex.pecFly],
      loadFor,
    });
    expect(alternatives.map((a) => a.exercise.id)).toEqual(['diverging-seated-row', 'rear-delt']);
  });

  it('offers at most 3 alternatives', () => {
    const alternatives = alternativesFor(ex.pecFly, {
      remaining: [ex.lateralRaise, ex.tricepsPushdown, ex.shoulderPress],
      otherFavorites: [ex.chestPress, ex.cableFly],
      loadFor,
    });
    expect(alternatives).toHaveLength(3);
  });
});

describe('waiting queue', () => {
  const session = ['db-bench', 'pec-fly', 'lateral-raise', 'triceps-pushdown'];

  it('runs the exercises in order', () => {
    let queue = startQueue(session);
    expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: 'db-bench' });
    queue = completeExercise(queue, 'db-bench');
    expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: 'pec-fly' });
  });

  it('asks again for the taken machine after the next exercise', () => {
    let queue = completeExercise(startQueue(session), 'db-bench');
    queue = markBusy(queue, 'pec-fly');
    expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: 'lateral-raise' });
    queue = completeExercise(queue, 'lateral-raise');
    expect(nextStep(queue)).toEqual({ kind: 'askIfFree', exerciseId: 'pec-fly' });
  });

  it('goes back to the machine when it is free', () => {
    let queue = markBusy(startQueue(session), 'db-bench');
    queue = completeExercise(queue, 'pec-fly');
    queue = startNow(queue, 'db-bench');
    expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: 'db-bench' });
    expect(queue.waiting).toEqual([]);
  });

  it('starts a chosen alternative right away', () => {
    let queue = markBusy(startQueue(session), 'db-bench');
    queue = startNow(queue, 'chest-press');
    expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: 'chest-press' });
  });

  it('carries a machine taken until the end over to the next session of the same type', () => {
    let queue = startQueue(['pec-fly', 'lateral-raise']);
    queue = markBusy(queue, 'pec-fly');
    queue = completeExercise(queue, 'lateral-raise');
    expect(nextStep(queue)).toEqual({ kind: 'askIfFree', exerciseId: 'pec-fly' });
    queue = stillBusy(queue, 'pec-fly');
    expect(nextStep(queue)).toEqual({ kind: 'finished', carryOver: ['pec-fly'] });
    expect(endSession(queue)).toEqual({ done: ['lateral-raise'], carryOver: ['pec-fly'] });
  });

  it('detects a crowded gym from 2 machines taken', () => {
    let queue = markBusy(startQueue(session), 'db-bench');
    expect(isCrowded(queue)).toBe(false);
    queue = markBusy(queue, 'pec-fly');
    expect(isCrowded(queue)).toBe(true);
  });

  it('rebuilds the end of the session with dumbbells and cables', () => {
    const fallback = crowdedFallback(
      [ex.pecFly, ex.lateralRaise, ex.legCurl],
      [ex.cableFly, ex.dumbbellLateralRaise, ex.chestPress],
    );
    expect(fallback).toEqual([
      { replaces: ex.pecFly, with: ex.cableFly },
      { replaces: ex.lateralRaise, with: ex.dumbbellLateralRaise },
    ]);
  });
});

describe('going back to the previous exercise', () => {
  it('reopens the last exercise done or skipped, in front of the queue', () => {
    let queue = startQueue(['db-bench', 'chest-press', 'pec-fly']);
    queue = completeExercise(queue, 'db-bench');
    queue = completeExercise(queue, 'chest-press'); // skipped too fast
    expect(previousExercise(queue)).toBe('chest-press');
    queue = reopenPrevious(queue);
    expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: 'chest-press' });
    expect(queue.done).toEqual(['db-bench']);
    expect(queue.pending).toEqual(['chest-press', 'pec-fly']);
    // Again: back to the bench press.
    queue = reopenPrevious(queue);
    expect(queue.pending).toEqual(['db-bench', 'chest-press', 'pec-fly']);
    expect(previousExercise(queue)).toBeUndefined();
  });

  it('works from the end of the session', () => {
    let queue = startQueue(['a']);
    queue = completeExercise(queue, 'a');
    expect(nextStep(queue).kind).toBe('finished');
    expect(nextStep(reopenPrevious(queue))).toEqual({ kind: 'exercise', exerciseId: 'a' });
  });

  it('does nothing at the start of the session', () => {
    const queue = startQueue(['a']);
    expect(reopenPrevious(queue)).toEqual(queue);
  });
});
