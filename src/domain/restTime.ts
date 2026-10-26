import type { Difficulty } from './types';

/**
 * Rest after a set, adapted to how hard it was: the usual rest of the
 * exercise, longer after a set at the limit or failed (more recovery before
 * the next one), shorter after an easy set. Steps to be validated by a coach.
 */
export const REST_ADJUST_SECONDS: Readonly<Record<Difficulty, number>> = {
  easy: -15,
  ok: 0,
  hard: 30,
  fail: 60,
};
/** Never shorter than this, even after an easy set. */
export const MIN_REST_SECONDS = 45;

export function restAfterSet(usualSeconds: number, difficulty: Difficulty): number {
  return Math.max(MIN_REST_SECONDS, usualSeconds + REST_ADJUST_SECONDS[difficulty]);
}
