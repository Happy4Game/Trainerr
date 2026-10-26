import { describe, expect, it } from 'vitest';
import { firstTimeEstimateKg } from '@/domain/firstLoad';
import { defaultStepsFor, floorStep } from '@/domain/loadSteps';
import type { Exercise } from '@/domain/types';

const exercise = (over: Partial<Exercise>): Exercise => ({
  id: 'x',
  kind: 'machineCompound',
  group: 'legs',
  equipment: 'machine',
  primaryMuscles: ['quads'],
  secondaryMuscles: [],
  ...over,
});
const first = (e: Exercise, weight = 75) =>
  floorStep(defaultStepsFor(e.equipment), firstTimeEstimateKg(e, weight));

describe('first time on a machine', () => {
  it('proposes a light but realistic test set', () => {
    expect(first(exercise({ kind: 'heavyCompound' }))).toBe(45); // leg press
    expect(first(exercise({ group: 'push' }))).toBe(20); // chest press
    expect(first(exercise({ group: 'pull', kind: 'heavyCompound' }))).toBe(30); // pulldown
    expect(first(exercise({ group: 'push', kind: 'isolation', equipment: 'cable' }))).toBe(5);
    expect(first(exercise({ group: 'push', kind: 'heavyCompound', equipment: 'barbell' }))).toBe(
      22.5,
    );
    expect(first(exercise({ group: 'push', kind: 'heavyCompound', equipment: 'dumbbell' }))).toBe(
      6,
    );
  });

  it('adds nothing to a body weight exercise', () => {
    expect(firstTimeEstimateKg(exercise({ equipment: 'bodyweight', group: 'core' }), 75)).toBe(0);
  });

  it('scales with the body weight', () => {
    expect(first(exercise({ kind: 'heavyCompound' }), 100)).toBe(60);
  });
});
