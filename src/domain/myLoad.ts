import type { IsoDate, SetLog } from './types';

export interface MyLoad {
  readonly loadKg: number;
  readonly reps: number;
  readonly date: IsoDate;
  /** From a logged session, or noted by hand on the card / in the catalog. */
  readonly source: 'session' | 'noted';
}

/**
 * Load the user lifts on a machine, for the catalog: the heaviest complete work
 * set of the last session with it, or the load noted by hand if more recent.
 */
export function myLoad(input: {
  /** Sessions with this exercise only, oldest first. */
  sessions: readonly { readonly date: IsoDate; readonly sets: readonly SetLog[] }[];
  noted?: { readonly loadKg: number; readonly reps: number; readonly date: IsoDate };
}): MyLoad | undefined {
  const last = input.sessions.at(-1);
  const best = last?.sets
    .filter((s) => !s.warmup && s.completeReps !== false)
    .reduce<SetLog | undefined>(
      (top, s) =>
        !top || s.loadKg > top.loadKg || (s.loadKg === top.loadKg && s.reps > top.reps) ? s : top,
      undefined,
    );
  const fromSession =
    last && best
      ? { loadKg: best.loadKg, reps: best.reps, date: last.date, source: 'session' as const }
      : undefined;
  const noted = input.noted ? { ...input.noted, source: 'noted' as const } : undefined;
  if (fromSession && noted) return noted.date > fromSession.date ? noted : fromSession;
  return fromSession ?? noted;
}
