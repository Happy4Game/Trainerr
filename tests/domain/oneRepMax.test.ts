import { describe, expect, it } from 'vitest';
import {
  bestComparableSet,
  countsForStrength,
  estimateOneRepMax,
  loadForReps,
  suggestLoadForReps,
} from '@/domain/oneRepMax';
import { stackSteps } from '../fixtures/exercises';

describe('estimated one-rep max (Epley)', () => {
  it('applies 1RM = load × (1 + reps / 30)', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
    expect(estimateOneRepMax(16, 12)).toBeCloseTo(22.4, 5);
    expect(estimateOneRepMax(60, 0)).toBe(60);
  });

  it('inverts the formula for "how much for X reps?"', () => {
    expect(loadForReps(133.333, 10)).toBeCloseTo(100, 2);
  });

  it('suggests the heaviest machine step that allows X reps', () => {
    const oneRepMax = estimateOneRepMax(52, 12); // 72.8
    expect(suggestLoadForReps(oneRepMax, 8, stackSteps)).toBe(52); // 57.5 → 52
    expect(suggestLoadForReps(oneRepMax, 15, stackSteps)).toBe(45); // 48.5 → 45
  });

  it('ignores warm-up, slow-tempo and incomplete sets', () => {
    expect(countsForStrength({ exerciseId: 'c', loadKg: 9, reps: 10, difficulty: 'ok' })).toBe(
      true,
    );
    expect(
      countsForStrength({
        exerciseId: 'c',
        loadKg: 9,
        reps: 10,
        difficulty: 'ok',
        slowTempo: true,
      }),
    ).toBe(false);
    expect(
      countsForStrength({ exerciseId: 'c', loadKg: 5, reps: 15, difficulty: 'easy', warmup: true }),
    ).toBe(false);
    expect(
      countsForStrength({
        exerciseId: 'c',
        loadKg: 9,
        reps: 10,
        difficulty: 'ok',
        completeReps: false,
      }),
    ).toBe(false);
  });

  it('picks the best comparable set', () => {
    const best = bestComparableSet([
      { exerciseId: 'c', loadKg: 8, reps: 12, difficulty: 'ok' },
      { exerciseId: 'c', loadKg: 12, reps: 12, difficulty: 'ok', slowTempo: true },
      { exerciseId: 'c', loadKg: 10, reps: 10, difficulty: 'hard' },
    ]);
    expect(best?.set.loadKg).toBe(10);
    expect(best?.oneRepMax).toBeCloseTo(13.33, 2);
    expect(bestComparableSet([])).toBeUndefined();
  });
});
