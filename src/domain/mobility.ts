import type { MuscleId } from './muscles';

/**
 * Joint warm-up before the session, 3 to 5 minutes, picked from the muscles
 * of the day. Content to be validated by a coach or a physiotherapist.
 */
export interface MobilityMove {
  readonly id: string;
  readonly seconds: number;
  readonly targets: readonly MuscleId[];
}

export const MOBILITY_MOVES: readonly MobilityMove[] = [
  { id: 'armCircles', seconds: 40, targets: ['frontDelts', 'sideDelts', 'rearDelts', 'chest'] },
  { id: 'wallSlides', seconds: 40, targets: ['upperBack', 'traps', 'rearDelts', 'lats'] },
  { id: 'thoracicRotations', seconds: 40, targets: ['upperBack', 'lats', 'obliques', 'chest'] },
  { id: 'wristCircles', seconds: 30, targets: ['forearms', 'biceps', 'triceps'] },
  { id: 'catCow', seconds: 40, targets: ['lowerBack', 'abs'] },
  { id: 'hipCircles', seconds: 40, targets: ['glutes', 'adductors', 'abductors'] },
  { id: 'legSwings', seconds: 40, targets: ['hamstrings', 'quads', 'glutes'] },
  { id: 'bodyweightSquats', seconds: 40, targets: ['quads', 'glutes', 'adductors'] },
  { id: 'ankleRocks', seconds: 30, targets: ['calves'] },
];

export const MOBILITY_MIN_SECONDS = 180;
export const MOBILITY_MAX_MOVES = 5;

/** Moves that best cover the muscles of the day, 3 to 5 minutes in total. */
export function mobilityRoutine(muscles: readonly MuscleId[]): MobilityMove[] {
  const scored = MOBILITY_MOVES.map((move, index) => ({
    move,
    index,
    score: move.targets.filter((m) => muscles.includes(m)).length,
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const picked = (scored.length > 0 ? scored.map(({ move }) => move) : [...MOBILITY_MOVES]).slice(
    0,
    MOBILITY_MAX_MOVES,
  );
  // Too short: hold each useful move a bit longer rather than add unrelated ones.
  const total = picked.reduce((t, m) => t + m.seconds, 0);
  const factor = total < MOBILITY_MIN_SECONDS ? MOBILITY_MIN_SECONDS / total : 1;
  const routine = picked.map((move) => ({
    ...move,
    seconds: Math.ceil((move.seconds * factor) / 5) * 5,
  }));
  const order = (m: MobilityMove) => MOBILITY_MOVES.findIndex((x) => x.id === m.id);
  return routine.sort((a, b) => order(a) - order(b));
}
