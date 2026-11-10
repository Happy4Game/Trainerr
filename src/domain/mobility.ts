import type { MuscleId } from './muscles';

/**
 * Moves of the guided warm-up before the session, following the RAMP method
 * (Jeffreys): Raise the temperature with light cardio, then Activate and
 * Mobilise the joints and muscles the session will work. The approach sets of
 * the first machine then Potentiate (finish the warm-up). Standing moves only
 * (nothing on the floor of the gym) except the glute bridge, which needs a mat.
 * Content to be validated by a coach or a physiotherapist.
 */
export interface MobilityMove {
  readonly id: string;
  readonly seconds: number;
  /** Done on one side, then the other: half the time each. */
  readonly sides?: boolean;
  /** Muscles woken up, shown on the body map when there is no licensed drawing. */
  readonly muscles: readonly MuscleId[];
}

/**
 * Raise: light cardio first. A general warm-up added to the approach sets gave
 * a higher leg-press maximum than the approach sets alone (Abad et al., 2011).
 */
export const RAISE_MOVE: MobilityMove = {
  id: 'lightCardio',
  seconds: 120,
  muscles: ['quads', 'glutes', 'calves'],
};

/** Upper body: shoulders, shoulder blades, wrists, then a first push. */
export const UPPER_MOVES: readonly MobilityMove[] = [
  { id: 'armCircles', seconds: 30, muscles: ['frontDelts', 'sideDelts', 'rearDelts'] },
  { id: 'bandPullApart', seconds: 30, muscles: ['rearDelts', 'upperBack', 'traps'] },
  { id: 'wristCircles', seconds: 20, muscles: ['forearms'] },
];

/** Only when the session pushes (chest, shoulders, triceps). */
export const PUSH_MOVE: MobilityMove = {
  id: 'easyPushUps',
  seconds: 30,
  muscles: ['chest', 'frontDelts', 'triceps'],
};

/** Lower body: hips, knees, ankles, glutes. */
export const LOWER_MOVES: readonly MobilityMove[] = [
  { id: 'legSwings', seconds: 30, sides: true, muscles: ['hamstrings', 'glutes', 'adductors'] },
  { id: 'bodyweightSquats', seconds: 30, muscles: ['quads', 'glutes', 'adductors'] },
  { id: 'gluteBridge', seconds: 30, muscles: ['glutes', 'hamstrings'] },
  { id: 'ankleCircles', seconds: 30, sides: true, muscles: ['calves'] },
];

/** Every move the warm-up can offer. */
export const MOBILITY_MOVES: readonly MobilityMove[] = [
  RAISE_MOVE,
  ...UPPER_MOVES,
  PUSH_MOVE,
  ...LOWER_MOVES,
];
