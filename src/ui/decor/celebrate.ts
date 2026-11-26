import { ref } from 'vue';
import { prefersReducedMotion } from '@/ui/motion';
import type { Settings } from '@/data/repositories/settingsRepository';

/** What is celebrated: the end of a session, or a record beaten during it. */
export type CelebrationKind = 'session' | 'record';

export interface Celebration {
  /** A new number each time, so that two records in a row both show. */
  readonly id: number;
  readonly kind: CelebrationKind;
}

/** The celebration on screen now (the mascot, and confetti for a session). */
export const celebration = ref<Celebration>();
let lastId = 0;

/** Asks for a celebration. Nothing when the phone asks for less motion. */
export function celebrate(kind: CelebrationKind): void {
  if (prefersReducedMotion()) return;
  lastId += 1;
  celebration.value = { id: lastId, kind };
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
