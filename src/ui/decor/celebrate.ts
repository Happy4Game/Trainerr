import { ref } from 'vue';
import { prefersReducedMotion } from '@/ui/motion';
import type { Settings } from '@/data/repositories/settingsRepository';
import {
  CELEBRATIONS,
  pickOne,
  type CelebrationKind,
  type MascotEntrance,
  type MascotPose,
} from './mascotLines';

export type { CelebrationKind } from './mascotLines';

export interface Celebration {
  /** A new number each time, so that two records in a row both show. */
  readonly id: number;
  readonly kind: CelebrationKind;
  readonly pose: MascotPose;
  readonly entrance: MascotEntrance;
  /** Translation key of what the mascot says. */
  readonly line: string;
  readonly confetti: boolean;
}

/** The celebration on screen now (the mascot, and confetti for a session). */
export const celebration = ref<Celebration>();
let lastId = 0;

/** Draws the pose, entrance and line of a moment. */
export function celebrationFor(
  kind: CelebrationKind,
  id: number,
  random: () => number = Math.random,
): Celebration {
  const style = CELEBRATIONS[kind];
  const index = pickOne(
    Array.from({ length: style.lines }, (_, i) => i),
    random,
  );
  return {
    id,
    kind,
    pose: pickOne(style.poses, random),
    entrance: pickOne(style.entrances, random),
    line: `decor.celebrations.${kind}.${index}`,
    confetti: style.confetti,
  };
}

/** A bigger moment is never replaced by a smaller one on the same tap. */
const PRIORITY: Readonly<Record<CelebrationKind, number>> = {
  session: 3,
  record: 2,
  firstSet: 1,
  halfway: 1,
  stretching: 1,
  weighIn: 1,
  photo: 1,
};

/** Asks for a celebration. Nothing when the phone asks for less motion. */
export function celebrate(kind: CelebrationKind): void {
  if (prefersReducedMotion()) return;
  const current = celebration.value;
  if (current && PRIORITY[current.kind] > PRIORITY[kind]) return;
  lastId += 1;
  celebration.value = celebrationFor(kind, lastId);
}

/** Once its animation is over: the screen is left as it was. */
export function celebrationOver(id: number): void {
  if (celebration.value?.id === id) celebration.value = undefined;
}

/**
 * Purely visual extras (mascot, waves, confetti): on unless turned off in the
 * settings, and never when the phone asks for less motion (WCAG 2.3.3).
 */
export function decorationsOn(settings: Pick<Settings, 'decorations'> | undefined): boolean {
  return settings?.decorations !== false && !prefersReducedMotion();
}
