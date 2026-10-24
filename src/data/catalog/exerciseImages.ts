import images from './exercise-images.json';

export interface ExerciseImage {
  readonly file: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly author: string;
  readonly authorUrl?: string;
}

export interface ExerciseIllustration {
  /** Name of the illustrated exercise on wger, shown in the caption. */
  readonly wgerName: string;
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
