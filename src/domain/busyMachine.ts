import type { Exercise } from './types';

export const MAX_ALTERNATIVES = 3;
export const CROWDED_GYM_THRESHOLD = 2;

export type Alternative =
  | { readonly kind: 'substitute'; readonly exercise: Exercise; readonly loadKg?: number }
  | { readonly kind: 'swap'; readonly exercise: Exercise; readonly loadKg?: number };

/**
 * Alternatives when a machine is taken: first other favorites working the same
 * muscles, then the remaining exercises of the session done earlier.
 */
export function alternativesFor(
  busy: Exercise,
  context: {
    remaining: readonly Exercise[];
    otherFavorites: readonly Exercise[];
    loadFor: (exerciseId: string) => number | undefined;
  },
): Alternative[] {
  const withLoad = <K extends Alternative['kind']>(kind: K, exercise: Exercise) => {
    const loadKg = context.loadFor(exercise.id);
    return loadKg === undefined ? { kind, exercise } : { kind, exercise, loadKg };
  };
  const substitutes = context.otherFavorites
    .filter((e) => e.id !== busy.id)
    .map((e, index) => ({ e, index, score: similarity(busy, e) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ e }) => withLoad('substitute', e));
  const swaps = context.remaining.filter((e) => e.id !== busy.id).map((e) => withLoad('swap', e));
  return [...substitutes, ...swaps].slice(0, MAX_ALTERNATIVES);
}

/** Shared primary muscles count double, a primary muscle worked as secondary counts once. */
function similarity(busy: Exercise, candidate: Exercise): number {
  const primary = busy.primaryMuscles.filter((m) => candidate.primaryMuscles.includes(m)).length;
  const secondary = busy.primaryMuscles.filter((m) =>
    candidate.secondaryMuscles.includes(m),
  ).length;
  return primary * 2 + secondary;
}

export interface ExerciseQueue {
  readonly pending: readonly string[];
  /** Taken machines, with the number of exercises done when they were last checked. */
  readonly waiting: readonly { readonly exerciseId: string; readonly since: number }[];
  readonly done: readonly string[];
}

export type QueueStep =
  | { readonly kind: 'exercise'; readonly exerciseId: string }
  | { readonly kind: 'askIfFree'; readonly exerciseId: string }
  | { readonly kind: 'finished'; readonly carryOver: readonly string[] };

export function startQueue(exerciseIds: readonly string[]): ExerciseQueue {
  return { pending: [...exerciseIds], waiting: [], done: [] };
}

export function markBusy(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  return {
    ...queue,
    pending: queue.pending.filter((id) => id !== exerciseId),
    waiting: [
      ...queue.waiting.filter((w) => w.exerciseId !== exerciseId),
      { exerciseId, since: queue.done.length },
    ],
  };
}

/** The machine is still taken: ask again after the next exercise. */
export function stillBusy(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  return markBusy(queue, exerciseId);
}

/** Starts an exercise now: a machine that became free, or a chosen alternative. */
export function startNow(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  return {
    ...queue,
    pending: [exerciseId, ...queue.pending.filter((id) => id !== exerciseId)],
    waiting: queue.waiting.filter((w) => w.exerciseId !== exerciseId),
  };
}

export function completeExercise(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  return {
    pending: queue.pending.filter((id) => id !== exerciseId),
    waiting: queue.waiting.filter((w) => w.exerciseId !== exerciseId),
    done: [...queue.done, exerciseId],
  };
}

/** Exercise added by hand during the session: done now (reopened if already done). */
export function addExercise(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  return startNow({ ...queue, done: queue.done.filter((id) => id !== exerciseId) }, exerciseId);
}

/** Exercise added from the session's program: at the end, the current one is not interrupted. */
export function appendExercise(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  if (
    queue.pending.includes(exerciseId) ||
    queue.waiting.some((w) => w.exerciseId === exerciseId)
  ) {
    return queue;
  }
  return {
    ...queue,
    pending: [...queue.pending, exerciseId],
    done: queue.done.filter((id) => id !== exerciseId),
  };
}

/** Last exercise done or skipped, that the user can go back to. */
export function previousExercise(queue: ExerciseQueue): string | undefined {
  return queue.done.at(-1);
}

/** Back to the previous exercise (skipped too fast): it comes first again. */
export function reopenPrevious(queue: ExerciseQueue): ExerciseQueue {
  const previous = previousExercise(queue);
  if (previous === undefined) return queue;
  return startNow({ ...queue, done: queue.done.slice(0, -1) }, previous);
}

export function nextStep(queue: ExerciseQueue): QueueStep {
  const due = queue.waiting.find((w) => queue.done.length > w.since);
  if (due) return { kind: 'askIfFree', exerciseId: due.exerciseId };
  const next = queue.pending[0];
  if (next !== undefined) return { kind: 'exercise', exerciseId: next };
  return { kind: 'finished', carryOver: queue.waiting.map((w) => w.exerciseId) };
}

/** Machines still taken at the end move to the next session of the same type. */
export function endSession(queue: ExerciseQueue): {
  done: readonly string[];
  carryOver: readonly string[];
} {
  return { done: queue.done, carryOver: queue.waiting.map((w) => w.exerciseId) };
}

export function isCrowded(queue: ExerciseQueue): boolean {
  return queue.waiting.length >= CROWDED_GYM_THRESHOLD;
}

/** Crowded gym: redo the end of the session with dumbbells and cables, same muscles. */
export function crowdedFallback(
  toReplace: readonly Exercise[],
  favorites: readonly Exercise[],
): { replaces: Exercise; with: Exercise }[] {
  const free = favorites.filter((e) => e.equipment === 'dumbbell' || e.equipment === 'cable');
  const used = new Set<string>();
  return toReplace.flatMap((exercise) => {
    const replacement = free.find(
      (e) =>
        e.id !== exercise.id &&
        !used.has(e.id) &&
        e.primaryMuscles.some((m) => exercise.primaryMuscles.includes(m)),
    );
    if (!replacement) return [];
    used.add(replacement.id);
    return [{ replaces: exercise, with: replacement }];
  });
}
