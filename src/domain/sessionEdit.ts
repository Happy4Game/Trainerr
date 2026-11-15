import type { ExerciseQueue } from './busyMachine';
import type { Exercise } from './types';

/**
 * Changes of a session in progress: another machine for the same movement,
 * the order of the exercises to come, fewer sets, and sets logged on the
 * wrong machine.
 */

export const MAX_REPLACEMENTS = 6;

/**
 * Same movement on another machine: the same main muscle, and the same family
 * (compound or isolation). My machines first, then the closest muscles.
 */
export function replacementsFor<E extends Exercise>(
  exercise: Exercise,
  candidates: readonly E[],
  isMine: (id: string) => boolean,
): E[] {
  const main = exercise.primaryMuscles[0];
  const compound = exercise.kind !== 'isolation';
  if (main === undefined) return [];
  const shared = (e: Exercise) =>
    e.primaryMuscles.filter((m) => exercise.primaryMuscles.includes(m)).length +
    e.secondaryMuscles.filter((m) => exercise.secondaryMuscles.includes(m)).length / 2;
  return candidates
    .filter((e) => e.id !== exercise.id && e.primaryMuscles[0] === main)
    .filter((e) => (e.kind !== 'isolation') === compound)
    .map((e, index) => ({ e, index }))
    .sort(
      (a, b) =>
        Number(isMine(b.e.id)) - Number(isMine(a.e.id)) ||
        shared(b.e) - shared(a.e) ||
        a.index - b.index,
    )
    .slice(0, MAX_REPLACEMENTS)
    .map(({ e }) => e);
}

/**
 * The machines chosen instead of others, in their place in the session. A
 * replacement already in the session leaves the original as it is.
 */
export function applySwaps<E extends Exercise>(
  exercises: readonly E[],
  swaps: Readonly<Record<string, string>>,
  lookup: (id: string) => E | undefined,
): E[] {
  const ids = new Set(exercises.map((e) => e.id));
  return exercises.map((e) => {
    const toId = swaps[e.id];
    const to = toId && !ids.has(toId) ? lookup(toId) : undefined;
    if (to) ids.add(to.id);
    return to ?? e;
  });
}

/** The new machine takes the place of the old one, wherever it was in the queue. */
export function replaceInQueue(queue: ExerciseQueue, fromId: string, toId: string): ExerciseQueue {
  const swap = (id: string) => (id === fromId ? toId : id);
  const unique = (ids: readonly string[]) => [...new Set(ids.map(swap))];
  return {
    pending: unique(queue.pending),
    waiting: queue.waiting
      .filter((w) => w.exerciseId !== toId)
      .map((w) => ({ ...w, exerciseId: swap(w.exerciseId) })),
    done: queue.done.filter((id) => id !== fromId && id !== toId),
  };
}

/** Moves an exercise to come one place earlier (−1) or later (+1). */
export function movePending(
  queue: ExerciseQueue,
  exerciseId: string,
  delta: -1 | 1,
): ExerciseQueue {
  const pending = [...queue.pending];
  const index = pending.indexOf(exerciseId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= pending.length) return queue;
  pending.splice(index, 1);
  pending.splice(target, 0, exerciseId);
  return { ...queue, pending };
}

/**
 * The exercises to come, in the order the session will really offer them: the
 * current one, then the taken machines (asked again right after it), then the
 * others.
 */
export function upcomingOrder(queue: ExerciseQueue): string[] {
  const waiting = queue.waiting.map((w) => w.exerciseId);
  const [current, ...rest] = queue.pending;
  return [...new Set([...(current === undefined ? [] : [current]), ...waiting, ...rest])];
}

/** The current exercise stays first: the others move around it. */
export function canMoveUpcoming(queue: ExerciseQueue, exerciseId: string, delta: -1 | 1): boolean {
  const order = upcomingOrder(queue);
  const first = queue.pending.length > 0 ? 1 : 0;
  const index = order.indexOf(exerciseId);
  return index >= first && index + delta >= first && index + delta < order.length;
}

/**
 * One place earlier or later among the exercises to come, taken machines
 * included. A taken machine moved by hand, or passed over by another exercise,
 * becomes a normal exercise at its new place: no more "Is it free?" question.
 * Two taken machines swapped stay taken.
 */
export function moveUpcoming(
  queue: ExerciseQueue,
  exerciseId: string,
  delta: -1 | 1,
): ExerciseQueue {
  if (!canMoveUpcoming(queue, exerciseId, delta)) return queue;
  const order = upcomingOrder(queue);
  const index = order.indexOf(exerciseId);
  const other = order[index + delta] as string;
  const isWaiting = (id: string) => queue.waiting.some((w) => w.exerciseId === id);
  if (isWaiting(exerciseId) && isWaiting(other)) {
    const swap = (id: string) => (id === exerciseId ? other : id === other ? exerciseId : id);
    const byId = new Map(queue.waiting.map((w) => [w.exerciseId, w]));
    const waiting = queue.waiting.map((w) => byId.get(swap(w.exerciseId)) ?? w);
    return { ...queue, waiting };
  }
  order[index] = other;
  order[index + delta] = exerciseId;
  const stillWaiting = queue.waiting.filter(
    (w) => w.exerciseId !== exerciseId && w.exerciseId !== other,
  );
  const waitingIds = new Set(stillWaiting.map((w) => w.exerciseId));
  return {
    ...queue,
    pending: order.filter((id) => !waitingIds.has(id)),
    waiting: stillWaiting,
  };
}

/** Removes an exercise not started yet from the rest of the session. */
export function removeFromQueue(queue: ExerciseQueue, exerciseId: string): ExerciseQueue {
  return {
    ...queue,
    pending: queue.pending.filter((id) => id !== exerciseId),
    waiting: queue.waiting.filter((w) => w.exerciseId !== exerciseId),
  };
}

/** One set less than planned, never below the sets already done nor below 1. */
export function withoutSet(
  exercises: readonly { readonly exerciseId: string; readonly sets: number }[],
  exerciseId: string,
  done: number,
): { exerciseId: string; sets: number }[] {
  return exercises.map((e) =>
    e.exerciseId === exerciseId ? { ...e, sets: Math.max(1, done, e.sets - 1) } : e,
  );
}

/**
 * Sets logged on the wrong machine moved to the right one: the user is on the
 * right one, so it comes now (or counts as done when its sets are all there),
 * and the wrong one, now without any set, goes back to come.
 */
export function afterMovingSets(
  queue: ExerciseQueue,
  input: { fromId: string; toId: string; fromHasSetsLeft: boolean; toComplete: boolean },
): ExerciseQueue {
  const { fromId, toId, fromHasSetsLeft, toComplete } = input;
  let { pending, done } = queue;
  if (!fromHasSetsLeft && done.includes(fromId)) {
    done = done.filter((id) => id !== fromId);
    pending = [...pending.filter((id) => id !== fromId), fromId];
  }
  if (toComplete) {
    pending = pending.filter((id) => id !== toId);
    if (!done.includes(toId)) done = [...done, toId];
  } else {
    done = done.filter((id) => id !== toId);
    pending = [toId, ...pending.filter((id) => id !== toId)];
  }
  return { ...queue, pending, done, waiting: queue.waiting.filter((w) => w.exerciseId !== toId) };
}
