import { stepsMinutes, type GuidedStep } from './guidedSteps';
import { LOWER_MOVES, PUSH_MOVE, RAISE_MOVE, UPPER_MOVES, type MobilityMove } from './mobility';
import type { PplGroup } from './types';

/**
 * Guided warm-up offered at the start of every session, one move at a time
 * like the session itself, each with a countdown (RAMP method, Jeffreys):
 * 2 min of light cardio, then the joints and muscles of today's session, in
 * about 4 to 6 minutes. Dynamic moves only: long static stretches (60 s or
 * more per muscle) lower strength right after (Behm & Chaouachi, 2011). The
 * approach sets of the first machine then finish the warm-up (Ribeiro et al.,
 * 2020 and 2021; McCrary et al., 2015). Content to be validated by a coach or
 * a physiotherapist.
 */
export type WarmupStep = GuidedStep;

export interface WarmupInput {
  /** Groups of the session's exercises (push, pull, legs, core). */
  readonly groups: readonly PplGroup[];
  /** Cardio planned before the weights: no need to raise the temperature again. */
  readonly cardioBefore?: boolean;
}

const toStep = ({ id, seconds, sides, muscles }: MobilityMove): WarmupStep => ({
  id,
  seconds,
  muscles,
  ...(sides ? { sides } : {}),
});

/**
 * The moves of today's warm-up: the upper body when the session pushes or
 * pulls, the lower body on a legs day, both for a full-body session (or when
 * the session is unknown, or abs only).
 */
export function guidedWarmup(input: WarmupInput = { groups: [] }): WarmupStep[] {
  const push = input.groups.includes('push');
  const upper = push || input.groups.includes('pull');
  const lower = input.groups.includes('legs');
  const both = upper === lower;
  const moves: MobilityMove[] = input.cardioBefore ? [] : [RAISE_MOVE];
  if (upper || both) moves.push(...UPPER_MOVES, ...(push || both ? [PUSH_MOVE] : []));
  if (lower || both) moves.push(...LOWER_MOVES);
  return moves.map(toStep);
}

/** Length in minutes, rounded, at least 1. */
export function warmupMinutes(steps: readonly WarmupStep[]): number {
  return stepsMinutes(steps);
}
