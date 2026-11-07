import images from './exercise-images.json';
import stretchingImages from './stretching-images.json';
import warmupImages from './warmup-images.json';

export interface ExerciseImage {
  readonly file: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly author: string;
  readonly authorUrl?: string;
}

export interface ExerciseIllustration {
  /** Name of the illustrated exercise at the source, shown in the caption. */
  readonly sourceName: string;
  /** Everkinetic, or wger.de for the few machines Everkinetic does not draw. */
  readonly source: string;
  readonly sourceUrl: string;
  /** Start and end of the movement when there are two. */
  readonly images: readonly ExerciseImage[];
}

const illustrations = images as Readonly<Record<string, ExerciseIllustration>>;

/** Licensed illustration of an exercise (scripts/update-exercise-images.mjs), if any. */
export function illustrationFor(exerciseId: string): ExerciseIllustration | undefined {
  return illustrations[exerciseId];
}

export function allIllustrations(): Readonly<Record<string, ExerciseIllustration>> {
  return illustrations;
}

const warmupIllustrations = warmupImages as Readonly<Record<string, ExerciseIllustration>>;

/** Licensed drawing of a joint warm-up move (scripts/update-warmup-images.mjs), if any. */
export function warmupIllustrationFor(moveId: string): ExerciseIllustration | undefined {
  return warmupIllustrations[moveId];
}

export function allWarmupIllustrations(): Readonly<Record<string, ExerciseIllustration>> {
  return warmupIllustrations;
}

const stretchingIllustrations = stretchingImages as Readonly<Record<string, ExerciseIllustration>>;

/**
 * Licensed drawing (or photo, when no drawing exists) of a guided stretch, from
 * Wikimedia Commons or wger.de, with its author and license. Never AI-made.
 */
export function stretchingIllustrationFor(stretchId: string): ExerciseIllustration | undefined {
  return stretchingIllustrations[stretchId];
}

export function allStretchingIllustrations(): Readonly<Record<string, ExerciseIllustration>> {
  return stretchingIllustrations;
}
