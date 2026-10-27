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
