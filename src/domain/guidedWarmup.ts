import { mobilityRoutine } from './mobility';
import type { MuscleId } from './muscles';

/**
 * Guided joint warm-up offered at the start of every session, one move at a
 * time like the session itself, each with a countdown. Short (3 to 5 minutes)
 * and picked from the muscles of the day. Dynamic moves only: long static
 * stretches (60 s or more per muscle) lower strength right after (Behm &
 * Chaouachi, 2011). The approach sets of the first machine then finish the
 * warm-up. Content to be validated by a coach or a physiotherapist.
 */
export interface WarmupStep {
  readonly id: string;
  readonly seconds: number;
}

/** Joint moves of the day, in order, each with its length. */
export function guidedWarmup(muscles: readonly MuscleId[]): WarmupStep[] {
  return mobilityRoutine(muscles).map(({ id, seconds }) => ({ id, seconds }));
}

/** Length in minutes, rounded, at least 1. */
export function warmupMinutes(steps: readonly WarmupStep[]): number {
  return Math.max(1, Math.round(steps.reduce((total, s) => total + s.seconds, 0) / 60));
}
