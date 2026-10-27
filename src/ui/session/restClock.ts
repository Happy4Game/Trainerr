/**
 * The end of the rest, kept on the phone: a hard quit of the app (swiped away,
 * killed by Android) no longer loses the countdown. Only the end time is
 * kept, so the countdown goes on at the right place after a restart.
 */
const KEY = 'trainerr.restEndsAt';

interface SavedRest {
  readonly sessionId: string;
  readonly endsAt: number;
}

export function saveRest(sessionId: string | undefined, endsAt: number | undefined): void {
  try {
    if (!sessionId || endsAt === undefined) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ sessionId, endsAt } satisfies SavedRest));
  } catch {
    // Storage refused (private mode): the rest is simply not kept.
  }
}

/** The rest of this session still running at `now`, if any. */
export function restoredRest(sessionId: string | undefined, now: number): number | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SavedRest> | null;
    if (!sessionId || saved?.sessionId !== sessionId || typeof saved.endsAt !== 'number')
      return undefined;
    return saved.endsAt > now ? saved.endsAt : undefined;
  } catch {
    return undefined;
  }
}
