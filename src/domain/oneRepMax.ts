import { floorStep, type LoadSteps } from './loadSteps';
import type { SetLog } from './types';

/** Epley formula: 1RM = load × (1 + reps / 30). */
export function estimateOneRepMax(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

/** Inverse Epley: the load that allows `reps` reps for a given 1RM. */
export function loadForReps(oneRepMaxKg: number, reps: number): number {
  return oneRepMaxKg / (1 + reps / 30);
}

/** "How much for X reps?", rounded down to an existing machine step. */
export function suggestLoadForReps(oneRepMaxKg: number, reps: number, steps: LoadSteps): number {
  return floorStep(steps, loadForReps(oneRepMaxKg, reps));
}

/** Warm-up, slow-tempo and incomplete sets are left out of strength comparisons. */
export function countsForStrength(set: SetLog): boolean {
  return !set.warmup && !set.slowTempo && set.completeReps !== false;
}

export function bestComparableSet(
  sets: readonly SetLog[],
): { set: SetLog; oneRepMax: number } | undefined {
  let best: { set: SetLog; oneRepMax: number } | undefined;
  for (const set of sets) {
    if (!countsForStrength(set)) continue;
    const oneRepMax = estimateOneRepMax(set.loadKg, set.reps);
    if (!best || oneRepMax > best.oneRepMax) best = { set, oneRepMax };
  }
  return best;
}
