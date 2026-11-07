import { mobilityRoutine } from './mobility';
import type { MuscleId } from './muscles';

/**
 * Guided warm-up offered at the start of every session, step by step like the
 * session itself. It follows the RAMP structure (Jeffreys): Raise the body
 * temperature, Activate and Mobilise the muscles of the day, Potentiate with
 * the approach sets of the first machine. Dynamic moves only: long static
 * stretches (60 s or more per muscle) lower strength right after (Behm &
 * Chaouachi, 2011). About 5 to 10 minutes in total, as the ACSM advises
 * (Garber et al., 2011). Content to be validated by a coach.
 */
export type WarmupPart = 'raise' | 'mobilise' | 'activate' | 'potentiate';

export interface WarmupStep {
  readonly id: string;
  readonly part: WarmupPart;
  /** Timed step: a countdown. */
  readonly seconds?: number;
  /** Counted step: reps to do (per side when perSide). */
  readonly reps?: number;
  readonly perSide?: boolean;
}

interface ActivationMove {
  readonly id: string;
  readonly reps: number;
  readonly perSide?: boolean;
  readonly targets: readonly MuscleId[];
}

/** Light cardio that warms the whole body before anything else. */
export const RAISE_SECONDS = 240;

/** Moves done without equipment, at low effort, to wake up the muscles of the day. */
export const ACTIVATION_MOVES: readonly ActivationMove[] = [
  { id: 'scapularPushUps', reps: 10, targets: ['chest', 'frontDelts', 'triceps', 'upperBack'] },
  {
    id: 'proneYRaises',
    reps: 10,
    targets: ['rearDelts', 'upperBack', 'traps', 'lats', 'sideDelts'],
  },
  { id: 'gluteBridges', reps: 12, targets: ['glutes', 'hamstrings', 'lowerBack'] },
  { id: 'lateralLunges', reps: 6, perSide: true, targets: ['adductors', 'quads', 'abductors'] },
  { id: 'deadBugs', reps: 8, perSide: true, targets: ['abs', 'obliques', 'lowerBack'] },
  { id: 'calfRaises', reps: 15, targets: ['calves'] },
  { id: 'bicepsTricepsSwings', reps: 15, targets: ['biceps', 'triceps', 'forearms'] },
];

export const ACTIVATION_MAX_MOVES = 2;

/** The activation moves that best match the muscles of the day (two at most). */
function activation(muscles: readonly MuscleId[]): ActivationMove[] {
  const scored = ACTIVATION_MOVES.map((move, index) => ({
    move,
    index,
    score: move.targets.filter((m) => muscles.includes(m)).length,
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, ACTIVATION_MAX_MOVES);
  return scored.sort((a, b) => a.index - b.index).map(({ move }) => move);
}

/**
 * Steps of the warm-up for the muscles of the session. The raise step is left
 * out when cardio is planned before the weights: it already warms up.
 */
export function guidedWarmup(input: {
  muscles: readonly MuscleId[];
  cardioBefore?: boolean;
}): WarmupStep[] {
  const { muscles, cardioBefore = false } = input;
  return [
    ...(cardioBefore ? [] : [{ id: 'raise', part: 'raise' as const, seconds: RAISE_SECONDS }]),
    ...mobilityRoutine(muscles).map((move) => ({
      id: move.id,
      part: 'mobilise' as const,
      seconds: move.seconds,
    })),
    ...activation(muscles).map((move) => ({
      id: move.id,
      part: 'activate' as const,
      reps: move.reps,
      ...(move.perSide ? { perSide: true } : {}),
    })),
    { id: 'approach', part: 'potentiate' },
  ];
}

/** Rough length in minutes, counting about 3 s per rep and 1 min for the last step. */
export function warmupMinutes(steps: readonly WarmupStep[]): number {
  const seconds = steps.reduce(
    (total, step) =>
      total + (step.seconds ?? (step.reps ? step.reps * 3 * (step.perSide ? 2 : 1) : 60)),
    0,
  );
  return Math.max(1, Math.round(seconds / 60));
}
