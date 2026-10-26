import type { Exercise } from './types';

/**
 * First time on a machine, with nothing noted: a light test set, as a share
 * of the body weight, so that it is light but not absurd (a 5 kg leg press).
 * Shares to be validated by a coach; dumbbells are per hand.
 */
const SHARES: Readonly<
  Record<'legs' | 'push' | 'pull' | 'core', { compound: number; isolation: number }>
> = {
  legs: { compound: 0.6, isolation: 0.2 },
  push: { compound: 0.3, isolation: 0.12 },
  pull: { compound: 0.4, isolation: 0.15 },
  core: { compound: 0.1, isolation: 0.1 },
};
/** One dumbbell carries about a quarter of a machine load for the same movement. */
const DUMBBELL_FACTOR = 0.3;

export function firstTimeEstimateKg(exercise: Exercise, bodyWeightKg: number): number {
  if (exercise.equipment === 'bodyweight') return 0;
  const share = SHARES[exercise.group][exercise.kind === 'isolation' ? 'isolation' : 'compound'];
  const factor = exercise.equipment === 'dumbbell' ? DUMBBELL_FACTOR : 1;
  return bodyWeightKg * share * factor;
}
