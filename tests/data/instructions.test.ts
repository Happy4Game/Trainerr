import { describe, expect, it } from 'vitest';
import { instructionsFor } from '@/data/catalog/instructions';

const curated = {
  cues: { fr: ['Dos collé'], en: ['Back against the pad'], source: 'BarBend' },
  instructionsEn: ['Sit down.'],
};
const plain = { instructionsEn: ['Lie on the bench.', 'Press the bar.'] };

describe('instructions shown on the card', () => {
  it('shows the French cues as written, in French', () => {
    expect(instructionsFor(curated, 'fr')).toEqual({
      lines: ['Dos collé'],
      lang: 'fr',
      translated: false,
      numbered: false,
    });
  });

  it('shows the English translation of the cues, with the French original on demand', () => {
    expect(instructionsFor(curated, 'en')).toEqual({
      lines: ['Back against the pad'],
      lang: 'en',
      translated: true,
      numbered: false,
      original: { lines: ['Dos collé'], lang: 'fr' },
    });
  });

  it('shows the machine translation of the English steps in French, original on demand', () => {
    expect(instructionsFor(plain, 'fr', ['Allonge-toi sur le banc.', 'Pousse la barre.'])).toEqual({
      lines: ['Allonge-toi sur le banc.', 'Pousse la barre.'],
      lang: 'fr',
      translated: true,
      numbered: true,
      original: { lines: plain.instructionsEn, lang: 'en' },
    });
  });

  it('falls back to the English steps when no translation exists', () => {
    expect(instructionsFor(plain, 'fr')).toEqual({
      lines: plain.instructionsEn,
      lang: 'en',
      translated: false,
      numbered: true,
    });
    expect(instructionsFor(plain, 'en').translated).toBe(false);
  });

  it('ignores a translation that does not match the steps', () => {
    expect(instructionsFor(plain, 'fr', ['Une seule étape']).lang).toBe('en');
  });
});
