import { describe, expect, it } from 'vitest';
import { detectStagnation, proteinTargetGrams, pushPullBalance } from '@/domain/tracking';

const curve = (values: number[]) =>
  values.map((oneRepMax, i) => ({ date: `2026-10-${String(10 + i).padStart(2, '0')}`, oneRepMax }));

describe('stagnation', () => {
  it('flags 3 sessions in a row without beating the previous best 1RM', () => {
    expect(detectStagnation(curve([60, 62, 61, 62, 60]))).toBe(true);
  });

  it('does not flag progress', () => {
    expect(detectStagnation(curve([60, 62, 61, 62, 63]))).toBe(false);
  });

  it('needs enough sessions to judge', () => {
    expect(detectStagnation(curve([60, 59, 58]))).toBe(false);
  });
});

describe('protein target', () => {
  it('is 1.6 g per kg of body weight per day (Morton 2018)', () => {
    expect(proteinTargetGrams(72.5)).toBe(116);
    expect(proteinTargetGrams(80)).toBe(128);
  });
});

describe('push / pull balance', () => {
  it('compares weekly push and pull sets', () => {
    expect(pushPullBalance({ chest: 8, triceps: 4, lats: 5, biceps: 3 })).toEqual({
      push: 12,
      pull: 8,
      pushDominant: true,
    });
    expect(pushPullBalance({ chest: 6, lats: 6 })).toEqual({
      push: 6,
      pull: 6,
      pushDominant: false,
    });
  });
});
