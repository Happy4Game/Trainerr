/**
 * Closing a session left open. Once the last set of the last exercise is
 * done, ten minutes without any news from the user close it on their behalf,
 * exactly as the "Finish" button would. The cardio planned after the weights
 * comes first: its minutes are added before the ten minutes start.
 */
export const AUTO_FINISH_MINUTES = 10;

const MINUTE = 60_000;

export interface AutoFinishInput {
  /** Every exercise of the queue is done (the "all done" card is shown). */
  readonly allDone: boolean;
  /** Last action of the user in the session (set, note, change…), ms since 1970. */
  readonly lastActivityAt: number | undefined;
  /** Minutes of the cardio planned after the weights and not logged yet. */
  readonly cardioAfterMinutes?: number;
}

/** When the session closes by itself; undefined while something is left to do. */
export function autoFinishAt(input: AutoFinishInput): number | undefined {
  if (!input.allDone || input.lastActivityAt === undefined) return undefined;
  const cardio = Math.max(0, input.cardioAfterMinutes ?? 0);
  return input.lastActivityAt + (cardio + AUTO_FINISH_MINUTES) * MINUTE;
}

/**
 * Last sign of life in a session reloaded after a restart: the latest of the
 * saved activity, the last set done and the start of the session.
 */
export function lastActivity(
  saved: number | undefined,
  setsDoneAt: readonly (number | undefined)[],
  startedAt: number | undefined,
): number | undefined {
  const times = [saved, startedAt, ...setsDoneAt].filter((t): t is number => t !== undefined);
  return times.length > 0 ? Math.max(...times) : undefined;
}
