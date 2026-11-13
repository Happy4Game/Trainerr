/**
 * Last action of the user in the session in progress, kept on the phone:
 * after a hard quit, the ten minutes before the automatic closing start from
 * the real last action, not from the restart of the app.
 */
const KEY = 'trainerr.lastActivity';

interface SavedActivity {
  readonly sessionId: string;
  readonly at: number;
}

export function saveActivity(sessionId: string | undefined, at: number): void {
  try {
    if (!sessionId) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ sessionId, at } satisfies SavedActivity));
  } catch {
    // Storage refused (private mode): the last set done is used instead.
  }
}

export function savedActivity(sessionId: string | undefined): number | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SavedActivity> | null;
    if (!sessionId || saved?.sessionId !== sessionId || typeof saved.at !== 'number')
      return undefined;
    return saved.at;
  } catch {
    return undefined;
  }
}
