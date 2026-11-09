import type { GuidedStep } from './guidedSteps';

/**
 * Guided stretches, to do at any time: after a session, on a rest day, in the
 * evening. Nothing is logged. Head to toe, every big muscle group of the
 * session, each held 60 s in all, as the ACSM advises for flexibility
 * (Garber et al., 2011: "a total of 60 s per exercise", at least 2 days a
 * week). A move done on one side is held 30 s per side.
 *
 * Static stretches keep or improve the range of motion (Afonso et al., 2021,
 * on par with strength training through the full range); they do not prevent
 * soreness (Cochrane review, Herbert et al., 2022). Held long right before
 * lifting, they lower strength (Behm & Chaouachi, 2011): after the session or
 * on another moment, not before. Content to be validated by a coach or a
 * physiotherapist.
 */
export const STRETCHES: readonly GuidedStep[] = [
  { id: 'chestWall', seconds: 60, sides: true, muscles: ['chest', 'frontDelts'] },
  { id: 'crossBody', seconds: 60, sides: true, muscles: ['rearDelts', 'upperBack'] },
  { id: 'overheadTriceps', seconds: 60, sides: true, muscles: ['triceps'] },
  { id: 'childPose', seconds: 60, muscles: ['lats', 'lowerBack'] },
  { id: 'standingQuad', seconds: 60, sides: true, muscles: ['quads'] },
  { id: 'seatedHamstring', seconds: 60, sides: true, muscles: ['hamstrings'] },
  { id: 'figureFour', seconds: 60, sides: true, muscles: ['glutes'] },
  { id: 'wallCalf', seconds: 60, sides: true, muscles: ['calves'] },
];

/** The stretches in order, head to toe. */
export function guidedStretching(): GuidedStep[] {
  return [...STRETCHES];
}
