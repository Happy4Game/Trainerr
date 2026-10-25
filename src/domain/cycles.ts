import { daysBetween } from './dates';
import type { IsoDate } from './types';

/**
 * Training blocks: 4 normal weeks then 1 lighter week (one set less per
 * exercise) to recover. Length and content to be validated by a coach.
 */
export const CYCLE_WEEKS = 5;
export const LIGHT_WEEK = 5;
/** Cycles on the same model before suggesting a change (to be validated). */
export const CYCLES_BEFORE_CHANGE = 3;

export function cycleWeek(
  cycleStart: IsoDate,
  today: IsoDate,
): { cycle: number; week: number; light: boolean } {
  const weeks = Math.max(0, Math.floor(daysBetween(cycleStart, today) / 7));
  const week = (weeks % CYCLE_WEEKS) + 1;
  return { cycle: Math.floor(weeks / CYCLE_WEEKS) + 1, week, light: week === LIGHT_WEEK };
}

/** Sets per exercise in the current week: one less in the light week, never below 1. */
export function setsForWeek(baseSets: number, light: boolean): number {
  return light ? Math.max(1, baseSets - 1) : baseSets;
}

/** Offer (never impose) another model after several cycles on the same one. */
export function suggestProgramChange(modelSince: IsoDate, today: IsoDate): boolean {
  return daysBetween(modelSince, today) >= CYCLES_BEFORE_CHANGE * CYCLE_WEEKS * 7;
}
