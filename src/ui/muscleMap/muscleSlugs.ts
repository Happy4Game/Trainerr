import type { MuscleId } from '@/domain/muscles';

export type BodyView = 'front' | 'back';
export interface BodyPart {
  readonly view: BodyView;
  readonly slug: string;
}

const front = (slug: string): BodyPart => ({ view: 'front', slug });
const back = (slug: string): BodyPart => ({ view: 'back', slug });

/** Where each muscle of the app is drawn on the MuscleMap silhouette. */
export const MUSCLE_SLUGS: Readonly<Record<MuscleId, readonly BodyPart[]>> = {
  chest: [front('chest')],
  frontDelts: [front('deltoids')],
  sideDelts: [front('deltoids'), back('deltoids')],
  rearDelts: [back('deltoids')],
  triceps: [front('triceps'), back('triceps')],
  biceps: [front('biceps')],
  forearms: [front('forearm'), back('forearm')],
  lats: [back('upper-back')],
  upperBack: [back('upper-back')],
  traps: [front('trapezius'), back('trapezius')],
  lowerBack: [back('lower-back')],
  abs: [front('abs')],
  obliques: [front('obliques')],
  glutes: [back('gluteal')],
  quads: [front('quadriceps')],
  hamstrings: [back('hamstring')],
  adductors: [front('adductors'), back('adductors')],
  // No dedicated path: the gluteus medius sits under the gluteal area.
  abductors: [back('gluteal')],
  calves: [front('calves'), back('calves')],
};

export type Highlight = 'primary' | 'secondary';

/** `view:slug` → highlight; a part worked as primary wins over secondary. */
export function highlightedParts(
  primary: readonly MuscleId[],
  secondary: readonly MuscleId[],
): Map<string, Highlight> {
  const parts = new Map<string, Highlight>();
  for (const muscle of secondary) {
    for (const p of MUSCLE_SLUGS[muscle]) parts.set(`${p.view}:${p.slug}`, 'secondary');
  }
  for (const muscle of primary) {
    for (const p of MUSCLE_SLUGS[muscle]) parts.set(`${p.view}:${p.slug}`, 'primary');
  }
  return parts;
}
