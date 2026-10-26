import { nearestStep, type LoadSteps } from './loadSteps';

export type PauseLength = 'underOneMonth' | 'oneToThreeMonths' | 'overThreeMonths';

/** Design choices to be validated; the real October 2026 case used 70 % after 6 months. */
export const COMEBACK_PLANS: Readonly<
  Record<PauseLength, { startRatio: number; setsPerExercise: number | undefined }>
> = {
  underOneMonth: { startRatio: 0.9, setsPerExercise: undefined },
  oneToThreeMonths: { startRatio: 0.8, setsPerExercise: 3 },
  overThreeMonths: { startRatio: 0.7, setsPerExercise: 3 },
};

export const COMEBACK_REDUCED_VOLUME_DAYS = 14;

export function comebackStartLoad(input: {
  referenceKg: number;
  pause: PauseLength;
  steps: LoadSteps;
}): number {
  return nearestStep(input.steps, input.referenceKg * COMEBACK_PLANS[input.pause].startRatio);
}

/** Sets per exercise during the first two weeks, or undefined for normal volume. */
export function comebackSetsPerExercise(
  pause: PauseLength,
  daysSinceRestart: number,
): number | undefined {
  if (daysSinceRestart >= COMEBACK_REDUCED_VOLUME_DAYS) return undefined;
  return COMEBACK_PLANS[pause].setsPerExercise;
}

/** "Back to the old level" gauge: current load / pre-break reference. */
export function returnToLevel(input: { currentKg: number; referenceKg: number }): {
  percent: number;
  reached: boolean;
} {
  const percent = Math.round((input.currentKg / input.referenceKg) * 100);
  return { percent, reached: input.currentKg >= input.referenceKg };
}
