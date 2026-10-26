import { areAntagonists, PROTECTED_ZONE_MUSCLES, type ProtectedZone } from './muscles';
import type { Exercise } from './types';

export type SupersetType = 'agonistAntagonist' | 'upperLower' | 'sameMuscle';

export type SessionBlock =
  | { readonly kind: 'single'; readonly exercise: Exercise }
  | {
      readonly kind: 'superset';
      readonly first: Exercise;
      readonly second: Exercise;
      readonly type: SupersetType;
      /** Same-muscle supersets lower the total load lifted (Zhang et al. 2025). */
      readonly reducesVolume?: true;
    };

export interface SupersetOptions {
  /** Upper / lower body pairs, only when the two machines are close to each other. */
  readonly allowUpperLower?: boolean;
  readonly allowSameMuscle?: boolean;
  readonly protectedZone?: ProtectedZone;
}

/** Supersets are offered automatically for short sessions. */
export function supersetsSuggestedFor(sessionMinutes: number): boolean {
  return sessionMinutes <= 45;
}

/**
 * Groups the session exercises into supersets, keeping their order. Each
 * exercise is paired with the best later partner: opposite muscles first,
 * then upper / lower body, then same muscle (when allowed).
 */
export function proposeSupersets(
  exercises: readonly Exercise[],
  options: SupersetOptions = {},
): SessionBlock[] {
  const used = new Set<number>();
  const blocks: SessionBlock[] = [];
  exercises.forEach((first, i) => {
    if (used.has(i)) return;
    let best: { index: number; type: SupersetType } | undefined;
    for (let j = i + 1; j < exercises.length; j++) {
      if (used.has(j)) continue;
      const type = pairType(first, exercises[j] as Exercise, options);
      if (type && (!best || TYPE_RANK[type] < TYPE_RANK[best.type])) best = { index: j, type };
    }
    if (!best) {
      blocks.push({ kind: 'single', exercise: first });
      return;
    }
    used.add(best.index);
    const second = exercises[best.index] as Exercise;
    blocks.push(
      best.type === 'sameMuscle'
        ? { kind: 'superset', first, second, type: best.type, reducesVolume: true }
        : { kind: 'superset', first, second, type: best.type },
    );
  });
  return blocks;
}

const TYPE_RANK: Readonly<Record<SupersetType, number>> = {
  agonistAntagonist: 0,
  upperLower: 1,
  sameMuscle: 2,
};

function pairType(a: Exercise, b: Exercise, options: SupersetOptions): SupersetType | undefined {
  // Heavy compounds (bench press, leg press) always stay as straight sets.
  if (a.kind === 'heavyCompound' || b.kind === 'heavyCompound') return undefined;
  if (options.protectedZone) {
    const zone = PROTECTED_ZONE_MUSCLES[options.protectedZone];
    const loadsZone = (e: Exercise) =>
      [...e.primaryMuscles, ...e.secondaryMuscles].some((m) => zone.includes(m));
    if (loadsZone(a) && loadsZone(b)) return undefined;
  }
  if (a.primaryMuscles.some((m) => b.primaryMuscles.includes(m))) {
    return options.allowSameMuscle ? 'sameMuscle' : undefined;
  }
  if (a.primaryMuscles.some((m) => b.primaryMuscles.some((n) => areAntagonists(m, n)))) {
    return 'agonistAntagonist';
  }
  const isLower = (e: Exercise) => e.group === 'legs';
  if (options.allowUpperLower && isLower(a) !== isLower(b)) return 'upperLower';
  return undefined;
}

/** Pairs of exercise ids from the blocks, in session order. */
export function supersetPairs(blocks: readonly SessionBlock[]): [string, string][] {
  return blocks.flatMap((block) =>
    block.kind === 'superset' ? [[block.first.id, block.second.id] as [string, string]] : [],
  );
}

/**
 * After a set inside a superset: go straight to the partner (no rest after the
 * first exercise of the pair), rest only after the second one.
 */
export function afterSupersetSet(
  pairs: readonly (readonly [string, string])[],
  exerciseId: string,
  stillToDo: (exerciseId: string) => boolean,
): { next?: string; rest: boolean } {
  const pair = pairs.find((p) => p.includes(exerciseId));
  if (!pair) return { rest: true };
  const partner = pair[0] === exerciseId ? pair[1] : pair[0];
  const isFirst = pair[0] === exerciseId;
  if (!stillToDo(partner)) return { rest: true };
  return { next: partner, rest: !isFirst };
}
