/**
 * Joint warm-up before the session: every joint of the body, from the neck to
 * the ankles, in about 5 minutes. Wide, controlled moves, no long-held stretch.
 * Content to be validated by a coach or a physiotherapist.
 */
export interface MobilityMove {
  readonly id: string;
  readonly seconds: number;
}

/** Head to toe: the order of the guided warm-up. */
export const MOBILITY_MOVES: readonly MobilityMove[] = [
  { id: 'neckNods', seconds: 20 },
  { id: 'armCircles', seconds: 30 },
  { id: 'wristCircles', seconds: 20 },
  { id: 'wallSlides', seconds: 30 },
  { id: 'thoracicRotations', seconds: 30 },
  { id: 'catCow', seconds: 30 },
  { id: 'hipCircles', seconds: 30 },
  { id: 'legSwings', seconds: 30 },
  { id: 'bodyweightSquats', seconds: 30 },
  { id: 'ankleCircles', seconds: 30 },
];
