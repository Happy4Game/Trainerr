/**
 * The end of the rest, kept on the phone: a hard quit of the app (swiped away,
 * killed by Android) no longer loses the countdown. Only the end time is
 * kept, so the countdown goes on at the right place after a restart.
 */
const KEY = 'trainerr.restEndsAt';

interface SavedRest {
  readonly sessionId: string;
  readonly endsAt: number;
  /** Start of the rest, for its full length on the timer (absent in older saves). */
  readonly startedAt?: number;
}

export function saveRest(
  sessionId: string | undefined,
  endsAt: number | undefined,
  startedAt?: number,
): void {
  try {
    if (!sessionId || endsAt === undefined) localStorage.removeItem(KEY);
    else
      localStorage.setItem(
        KEY,
        JSON.stringify({
          sessionId,
          endsAt,
          ...(startedAt === undefined ? {} : { startedAt }),
        } satisfies SavedRest),
      );
  } catch {
    // Storage refused (private mode): the rest is simply not kept.
  }
}

/** The rest of this session still running at `now`, if any. */
export function restoredRest(
  sessionId: string | undefined,
  now: number,
): { endsAt: number; startedAt?: number } | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SavedRest> | null;
    if (!sessionId || saved?.sessionId !== sessionId || typeof saved.endsAt !== 'number')
      return undefined;
    if (saved.endsAt <= now) return undefined;
    return typeof saved.startedAt === 'number'
      ? { endsAt: saved.endsAt, startedAt: saved.startedAt }
      : { endsAt: saved.endsAt };
  } catch {
    return undefined;
  }
}
