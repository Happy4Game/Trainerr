import { MOBILITY_MOVES } from './mobility';

/**
 * Guided joint warm-up offered at the start of every session, one move at a
 * time like the session itself, each with a countdown. The whole body, head
 * to toe, in about 5 minutes. Dynamic moves only: long static stretches (60 s
 * or more per muscle) lower strength right after (Behm & Chaouachi, 2011). The
 * approach sets of the first machine then finish the warm-up. Content to be
 * validated by a coach or a physiotherapist.
 */
export interface WarmupStep {
  readonly id: string;
  readonly seconds: number;
}

/** Every joint move, head to toe, each with its length. */
export function guidedWarmup(): WarmupStep[] {
  return MOBILITY_MOVES.map(({ id, seconds }) => ({ id, seconds }));
}

/** Length in minutes, rounded, at least 1. */
export function warmupMinutes(steps: readonly WarmupStep[]): number {
  return Math.max(1, Math.round(steps.reduce((total, s) => total + s.seconds, 0) / 60));
}
