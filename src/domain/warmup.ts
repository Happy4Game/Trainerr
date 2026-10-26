import { nearestStep, stepDown, type LoadSteps } from './loadSteps';
import type { Exercise } from './types';

export const WARMUP_RATIO = 0.55;

/**
 * One light approach set, about 50–60 % of the work load: before the first
 * exercise of the session and before every heavy compound.
 */
export function warmupSet(input: {
  exercise: Exercise;
  workLoadKg: number;
  steps: LoadSteps;
  isFirst: boolean;
}): { loadKg: number; reps: number } | undefined {
  const { exercise, workLoadKg, steps, isFirst } = input;
  const heavy = exercise.kind === 'heavyCompound';
  if (!isFirst && !heavy) return undefined;
  if (steps.length === 0) return undefined;
  let loadKg = nearestStep(steps, workLoadKg * WARMUP_RATIO);
  if (loadKg >= workLoadKg) {
    const lower = stepDown(steps, workLoadKg);
    if (lower === undefined) return undefined;
    loadKg = lower;
  }
  return { loadKg, reps: heavy ? 12 : 15 };
}
