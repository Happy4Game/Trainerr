import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  floorStep,
  isMissingStepJump,
  nearestStep,
  normalizeSteps,
  stepDown,
  stepUp,
  uniformSteps,
} from '@/domain/loadSteps';
import { dumbbellSteps, stackSteps } from '../fixtures/exercises';

describe('load steps', () => {
  it('builds uniform steps without floating point drift', () => {
    expect(uniformSteps(2.5, 10, 2.5)).toEqual([2.5, 5, 7.5, 10]);
    expect(uniformSteps(1.25, 5, 1.25)).toEqual([1.25, 2.5, 3.75, 5]);
  });

  it('sorts and dedupes user-entered steps', () => {
    expect(normalizeSteps([59, 52, 52, 45, -1, 0])).toEqual([45, 52, 59]);
  });

  it('moves one step up or down', () => {
    expect(stepUp(stackSteps, 52)).toBe(59);
    expect(stepDown(stackSteps, 45)).toBe(39);
    expect(stepUp(stackSteps, 86)).toBeUndefined();
    expect(stepDown(stackSteps, 25)).toBeUndefined();
  });

  it('handles a load typed between two steps', () => {
    expect(stepUp(stackSteps, 55)).toBe(59);
    expect(stepDown(stackSteps, 55)).toBe(52);
  });

  it('rounds to the nearest step, ties going to the lighter one', () => {
    expect(nearestStep(dumbbellSteps, 15.4)).toBe(16);
    expect(nearestStep(dumbbellSteps, 15)).toBe(14);
    expect(nearestStep(stackSteps, 200)).toBe(86);
    expect(nearestStep(stackSteps, 1)).toBe(25);
  });

  it('rounds down to a step, or the lightest step', () => {
    expect(floorStep(stackSteps, 58.9)).toBe(52);
    expect(floorStep(stackSteps, 10)).toBe(25);
  });

  it('rejects empty step lists', () => {
    expect(() => nearestStep([], 10)).toThrow();
    expect(() => floorStep([], 10)).toThrow();
  });

  it('flags a jump bigger than both 10 % and 2.5 kg as a missing step', () => {
    expect(isMissingStepJump(52, 59)).toBe(true);
    expect(isMissingStepJump(16, 18)).toBe(false); // 12.5 % but only 2 kg
    expect(isMissingStepJump(107, 110)).toBe(false); // 3 kg but only 2.8 %
  });

  it('always returns an existing step (property)', () => {
    const steps = fc.uniqueArray(fc.integer({ min: 1, max: 300 }), { minLength: 1 });
    fc.assert(
      fc.property(steps, fc.double({ min: 0, max: 400, noNaN: true }), (raw, target) => {
        const normalized = normalizeSteps(raw);
        expect(normalized).toContain(nearestStep(normalized, target));
        expect(normalized).toContain(floorStep(normalized, target));
      }),
    );
  });
});
