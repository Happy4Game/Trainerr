import type { CatalogExercise } from './catalog';

export type InstructionLanguage = 'fr' | 'en';

export interface ShownInstructions {
  readonly lines: readonly string[];
  readonly lang: InstructionLanguage;
  /** Machine translation: the card says so and offers the original. */
  readonly translated: boolean;
  /** Steps of free-exercise-db are numbered, short cues are not. */
  readonly numbered: boolean;
  readonly original?: { readonly lines: readonly string[]; readonly lang: InstructionLanguage };
}

/**
 * What the card shows in the user's language. French cues are written by
 * hand; their English version and the French version of free-exercise-db
 * steps are machine translations, shown as such with the original on demand.
 */
export function instructionsFor(
  exercise: Pick<CatalogExercise, 'cues' | 'instructionsEn'>,
  language: InstructionLanguage,
  frenchSteps?: readonly string[],
): ShownInstructions {
  const { cues } = exercise;
  if (cues) {
    if (language === 'en' && cues.en && cues.en.length > 0) {
      return {
        lines: cues.en,
        lang: 'en',
        translated: true,
        numbered: false,
        original: { lines: cues.fr, lang: 'fr' },
      };
    }
    return { lines: cues.fr, lang: 'fr', translated: false, numbered: false };
  }
  const steps = exercise.instructionsEn;
  // A translation must keep one line per step, or it is not trusted.
  // The source has a few empty steps: kept for the line count, not shown.
  const shown = (lines: readonly string[]) => lines.filter((line) => line.trim() !== '');
  if (language === 'fr' && frenchSteps && frenchSteps.length === steps.length) {
    return {
      lines: shown(frenchSteps),
      lang: 'fr',
      translated: true,
      numbered: true,
      original: { lines: shown(steps), lang: 'en' },
    };
  }
  return { lines: shown(steps), lang: 'en', translated: false, numbered: true };
}
