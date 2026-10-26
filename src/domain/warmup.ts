import { nearestStep, stepDown, type LoadSteps } from './loadSteps';
import type { Exercise } from './types';

export const WARMUP_RATIO = 0.55;

/**
 * Before a heavy compound, approach sets rising towards the work load, with
 * fewer and fewer reps so that they warm up without tiring: 40 % × 8,
 * 60 % × 5, 80 % × 3 (usual ramp, to be validated by a coach).
 */
export const HEAVY_RAMP: readonly { readonly ratio: number; readonly reps: number }[] = [
  { ratio: 0.4, reps: 8 },
  { ratio: 0.6, reps: 5 },
  { ratio: 0.8, reps: 3 },
];

export interface WarmupSet {
  readonly loadKg: number;
  readonly reps: number;
}

/**
 * Warm-up sets of an exercise: the ramp on a heavy compound, one light set
 * (about 55 % × 12–15) on the first exercise of the session, none otherwise.
 * Loads are real steps of the machine, lighter than the work load, never twice
 * the same.
 */
export function warmupRamp(input: {
  exercise: Exercise;
  workLoadKg: number;
  steps: LoadSteps;
  isFirst: boolean;
}): WarmupSet[] {
  const { exercise, workLoadKg, steps, isFirst } = input;
  const heavy = exercise.kind === 'heavyCompound';
  if ((!isFirst && !heavy) || steps.length === 0) return [];
  const plan = heavy ? HEAVY_RAMP : [{ ratio: WARMUP_RATIO, reps: 15 }];
  const sets: WarmupSet[] = [];
  for (const { ratio, reps } of plan) {
    let loadKg = nearestStep(steps, workLoadKg * ratio);
    if (loadKg >= workLoadKg) {
      const lower = stepDown(steps, workLoadKg);
      if (lower === undefined) continue;
      loadKg = lower;
    }
    if (loadKg <= 0 || sets.some((s) => s.loadKg >= loadKg)) continue;
    sets.push({ loadKg, reps });
  }
  return sets;
}
