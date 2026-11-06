/** One set number: last time and today, side by side. */
export interface ComparedSet<S> {
  /** 1 for the first work set. */
  readonly number: number;
  readonly before?: S;
  readonly now?: S;
  /** Today against last time: heavier, or same load and more reps, is "up". */
  readonly trend?: 'up' | 'same' | 'down';
}

/**
 * The sets of an exercise today next to those of the last session, set by
 * set, with an arrow for each one done. Loads are compared as given: on an
 * assisted machine, pass the real load (less help = heavier).
 */
export function compareWithLastTime<S extends { readonly loadKg: number; readonly reps: number }>(
  lastTime: readonly S[],
  today: readonly S[],
  planned = 0,
): ComparedSet<S>[] {
  const count = Math.max(lastTime.length, today.length, planned);
  return Array.from({ length: count }, (_, i) => {
    const before = lastTime[i];
    const now = today[i];
    return {
      number: i + 1,
      ...(before ? { before } : {}),
      ...(now ? { now } : {}),
      ...(before && now ? { trend: trendOf(before, now) } : {}),
    };
  });
}

function trendOf(
  before: { loadKg: number; reps: number },
  now: { loadKg: number; reps: number },
): 'up' | 'same' | 'down' {
  if (now.loadKg !== before.loadKg) return now.loadKg > before.loadKg ? 'up' : 'down';
  if (now.reps !== before.reps) return now.reps > before.reps ? 'up' : 'down';
  return 'same';
}
