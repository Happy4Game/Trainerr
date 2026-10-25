import { describe, expect, it } from 'vitest';
import { setAdvice } from '@/domain/setAdvice';

const proposal = (loadKg: number, targetReps: number, reason = 'inRange') => ({
  loadKg,
  targetReps,
  reason,
});

describe('advice shown before a set', () => {
  it('says to go heavier when the load goes up', () => {
    expect(setAdvice(proposal(22.5, 8, 'easy'), { loadKg: 20, reps: 10 })).toBe('moreLoad');
  });

  it('says to aim for more reps at the same load', () => {
    expect(setAdvice(proposal(20, 11), { loadKg: 20, reps: 10 })).toBe('moreReps');
  });

  it('says to keep the same set', () => {
    expect(setAdvice(proposal(20, 10, 'hard'), { loadKg: 20, reps: 10 })).toBe('same');
  });

  it('says to go lighter after a failure', () => {
    expect(setAdvice(proposal(17.5, 10, 'failure'), { loadKg: 20, reps: 6 })).toBe('lighter');
  });

  it('fewer reps at the same load is still "keep the load"', () => {
    expect(setAdvice(proposal(20, 8), { loadKg: 20, reps: 10 })).toBe('same');
  });

  it('has no comparison the first time', () => {
    expect(setAdvice(proposal(10, 12, 'testSet'), undefined)).toBe('first');
  });

  it('a comeback is never "go heavier" even above the last session', () => {
    expect(setAdvice(proposal(30, 10, 'comeback'), { loadKg: 20, reps: 10 })).toBe('comeback');
  });
});
