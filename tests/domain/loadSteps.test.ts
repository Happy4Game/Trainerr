import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  defaultStepsFor,
  floorStep,
  isMissingStepJump,
  nearestStep,
  normalizeSteps,
  parseLoad,
  snapToFineStep,
  stackBreakdown,
  withAddOns,
  stepDown,
  stepUp,
  stepUpOrBeyond,
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

  it('reads a load typed with a comma or a dot', () => {
    expect(parseLoad('2,5')).toBe(2.5);
    expect(parseLoad('2.5')).toBe(2.5);
    expect(parseLoad(' 52 kg ')).toBe(52);
    expect(parseLoad('')).toBeUndefined();
    expect(parseLoad('abc')).toBeUndefined();
    expect(parseLoad('-3')).toBeUndefined();
    expect(parseLoad('0')).toBeUndefined();
  });

  it('offers default steps until the machine is set up', () => {
    expect(defaultStepsFor('dumbbell').slice(0, 3)).toEqual([2, 4, 6]);
    expect(defaultStepsFor('barbell').slice(0, 3)).toEqual([20, 22.5, 25]);
    expect(defaultStepsFor('machine').slice(0, 3)).toEqual([5, 10, 15]);
    expect(defaultStepsFor('cable').slice(0, 3)).toEqual([5, 10, 15]);
    expect(defaultStepsFor('bodyweight').slice(0, 3)).toEqual([0, 5, 10]);
  });

  it('never caps a strong lifter before the machine is set up', () => {
    expect(stepUp(defaultStepsFor('bodyweight'), 50)).toBe(55);
    expect(defaultStepsFor('bodyweight').at(-1)).toBe(150);
    expect(defaultStepsFor('machine').at(-1)).toBe(500);
    expect(defaultStepsFor('cable').at(-1)).toBe(500);
    expect(defaultStepsFor('dumbbell').at(-1)).toBe(100);
    expect(defaultStepsFor('barbell').at(-1)).toBe(500);
  });

  it('"+" goes past the heaviest step by the last gap', () => {
    expect(stepUpOrBeyond([0, 5, 10], 5)).toBe(10);
    expect(stepUpOrBeyond([0, 5, 10], 10)).toBe(15);
    expect(stepUpOrBeyond([0, 5, 10], 12.5)).toBe(17.5);
    expect(stepUpOrBeyond([20], 20)).toBe(25);
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

describe('fine loads on a machine', () => {
  it('adds every combination of add-on weights to each plate', () => {
    expect(withAddOns([40, 45], [1.25, 2.5])).toEqual([
      40, 41.25, 42.5, 43.75, 45, 46.25, 47.5, 48.75,
    ]);
    expect(withAddOns([40, 45])).toEqual([40, 45]);
    // Body weight: no extra load is a step too.
    expect(withAddOns([0, 5])).toEqual([0, 5]);
  });

  it('rounds a typed load to the machine precision, never finer than 0.5 kg', () => {
    expect(snapToFineStep(52.3)).toBe(52.5);
    expect(snapToFineStep(52.2, 0.1)).toBe(52);
    expect(snapToFineStep(53, 2.5)).toBe(52.5);
    expect(snapToFineStep(41.3, 1.25)).toBe(41.25);
  });

  it('tells which plate and add-ons give a load', () => {
    expect(stackBreakdown(47.5, [40, 45, 50], [1.25, 2.5])).toEqual({
      plateKg: 45,
      addOnsKg: [2.5],
    });
    expect(stackBreakdown(48.75, [40, 45, 50], [1.25, 2.5])).toEqual({
      plateKg: 45,
      addOnsKg: [1.25, 2.5],
    });
    expect(stackBreakdown(45, [40, 45], [1.25])).toEqual({ plateKg: 45, addOnsKg: [] });
    expect(stackBreakdown(44, [40, 45], [1.25])).toBeUndefined();
  });

  it('always finds back the plate of a load built from it', () => {
    fc.assert(
      fc.property(fc.constantFrom(...stackSteps), fc.subarray([1.25, 2.5]), (plate, addOns) => {
        const load = addOns.reduce((s, a) => s + a, plate);
        const found = stackBreakdown(load, stackSteps, [1.25, 2.5]);
        return (
          found !== undefined &&
          Math.abs(found.plateKg + found.addOnsKg.reduce((s, a) => s + a, 0) - load) < 1e-6
        );
      }),
    );
  });
});
