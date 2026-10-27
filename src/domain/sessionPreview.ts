/**
 * What the next session looks like before it starts: its rough length, and
 * how the load of each exercise moves since last time.
 */

/** A work set and its rest take about 2.5 minutes; rounded to 5 min, never below 10. */
export function estimateMinutes(workSets: number): number {
  return Math.max(10, Math.round((workSets * 2.5) / 5) * 5);
}

export type LoadChange =
  | { readonly kind: 'first' }
  | { readonly kind: 'same' }
  | { readonly kind: 'up' | 'down'; readonly deltaKg: number };

/**
 * Proposed load against the heaviest work set of last time. On a help
 * machine the load is the help, so less help is the step up.
 */
export function loadChange(input: {
  proposedKg: number;
  lastLoadsKg: readonly number[];
  assisted?: boolean;
}): LoadChange {
  if (input.lastLoadsKg.length === 0) return { kind: 'first' };
  const last = input.assisted ? Math.min(...input.lastLoadsKg) : Math.max(...input.lastLoadsKg);
  const gain = input.assisted ? last - input.proposedKg : input.proposedKg - last;
  const deltaKg = Math.round(Math.abs(gain) * 100) / 100;
  if (deltaKg === 0) return { kind: 'same' };
  return { kind: gain > 0 ? 'up' : 'down', deltaKg };
}

/** Weight × reps of the work sets: the volume of a session. */
export function workload(
  sets: readonly { loadKg: number; reps: number; warmup?: boolean }[],
): number {
  return sets.filter((s) => !s.warmup).reduce((total, s) => total + s.loadKg * s.reps, 0);
}

/** Whole percent of volume gained since last time; undefined when not more. */
export function volumeGainPercent(previousKg: number, nowKg: number): number | undefined {
  if (previousKg <= 0) return undefined;
  const percent = Math.round(((nowKg - previousKg) / previousKg) * 100);
  return percent >= 1 ? percent : undefined;
}

/** Whole minutes between start and end; undefined for a session left open for hours. */
export function sessionMinutes(startedAt: number | undefined, endedAt: number): number | undefined {
  if (startedAt === undefined) return undefined;
  const minutes = Math.round((endedAt - startedAt) / 60_000);
  return minutes >= 1 && minutes <= 240 ? minutes : undefined;
}
