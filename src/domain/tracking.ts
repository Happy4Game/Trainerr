import { PULL_MUSCLES, PUSH_MUSCLES, type MuscleId } from './muscles';
import type { IsoDate } from './types';

/** Sessions without progress before suggesting a variant or a lighter week (to be validated). */
export const STAGNATION_SESSIONS = 3;

/**
 * True when the last 3 sessions of an exercise did not beat the best
 * estimated 1RM reached before them.
 */
export function detectStagnation(curve: readonly { date: IsoDate; oneRepMax: number }[]): boolean {
  if (curve.length <= STAGNATION_SESSIONS) return false;
  const before = curve.slice(0, -STAGNATION_SESSIONS).map((p) => p.oneRepMax);
  const recent = curve.slice(-STAGNATION_SESSIONS).map((p) => p.oneRepMax);
  return Math.max(...recent) <= Math.max(...before);
}

/** Morton et al. 2018: gains plateau around 1.6 g of protein per kg per day. */
export const PROTEIN_G_PER_KG = 1.6;

export function proteinTargetGrams(bodyWeightKg: number): number {
  return Math.round(bodyWeightKg * PROTEIN_G_PER_KG);
}

/** Push dominates when it exceeds pull by more than this ratio (to be validated). */
export const PUSH_DOMINANCE_RATIO = 1.3;

export function pushPullBalance(weeklySets: Partial<Record<MuscleId, number>>): {
  push: number;
  pull: number;
  pushDominant: boolean;
} {
  const sum = (muscles: readonly MuscleId[]) =>
    muscles.reduce((total, m) => total + (weeklySets[m] ?? 0), 0);
  const push = sum(PUSH_MUSCLES);
  const pull = sum(PULL_MUSCLES);
  return { push, pull, pushDominant: push > pull * PUSH_DOMINANCE_RATIO };
}
