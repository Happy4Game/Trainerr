import type { MuscleId } from './muscles';

/**
 * One step of a guided routine (joint warm-up, stretches): a move held or
 * repeated for a number of seconds, with a countdown.
 */
export interface GuidedStep {
  readonly id: string;
  readonly seconds: number;
  /** Done on one side, then the other: half the time each, a beep to change sides. */
  readonly sides?: boolean;
  /** Muscles worked, shown on the body map when there is no licensed drawing. */
  readonly muscles?: readonly MuscleId[];
}

/** Length in minutes, rounded, at least 1. */
export function stepsMinutes(steps: readonly GuidedStep[]): number {
  return Math.max(1, Math.round(steps.reduce((total, s) => total + s.seconds, 0) / 60));
}
