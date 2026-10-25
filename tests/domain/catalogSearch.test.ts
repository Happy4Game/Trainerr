import { describe, expect, it } from 'vitest';
import {
  catalogSection,
  compareCatalog,
  compareNames,
  matchesSearch,
  normalizeForSearch,
} from '@/domain/catalogSearch';

describe('catalog search', () => {
  it('ignores accents and case', () => {
    expect(normalizeForSearch('Épaule')).toBe('epaule');
    expect(normalizeForSearch('  ÉCARTÉ  ')).toBe('ecarte');
  });

  it('finds "Épaule" when typing "epaule"', () => {
    expect(matchesSearch(['Développé épaules machine', 'Shoulder Press'], 'epaule')).toBe(true);
  });

  it('matches every word, in any of the texts', () => {
    expect(matchesSearch(['Développé épaules machine', 'Shoulder Press'], 'dev press')).toBe(true);
    expect(matchesSearch(['Développé épaules machine'], 'dev curl')).toBe(false);
  });

  it('matches everything on an empty query', () => {
    expect(matchesSearch(['Leg Press'], '   ')).toBe(true);
  });

  it('sorts names the French way', () => {
    const names = ['Extension des jambes', 'Écarté à la machine', 'Développé couché', 'curl'];
    expect([...names].sort(compareNames('fr-FR'))).toEqual([
      'curl',
      'Développé couché',
      'Écarté à la machine',
      'Extension des jambes',
    ]);
  });
});

describe('catalog order', () => {
  const entry = (
    name: string,
    flags: { favorite?: boolean; popular?: boolean; illustrated?: boolean },
  ) => ({
    name,
    favorite: false,
    popular: false,
    illustrated: false,
    ...flags,
  });

  it('puts my machines first, then popular illustrated machines, then illustrated ones', () => {
    const entries = [
      entry('Zercher', {}),
      entry('Tirage', { popular: true }),
      entry('Presse', { popular: true, illustrated: true }),
      entry('Curl araignée', { illustrated: true }),
      entry('Abducteurs', { popular: true, illustrated: true }),
      entry('Pec deck', { favorite: true }),
    ];
    const compare = compareCatalog(compareNames('fr-FR'));
    expect([...entries].sort(compare).map((e) => e.name)).toEqual([
      'Pec deck',
      'Abducteurs',
      'Presse',
      'Tirage',
      'Curl araignée',
      'Zercher',
    ]);
  });

  it('names the section of each entry', () => {
    expect(catalogSection(entry('a', { favorite: true, popular: true }))).toBe('favorites');
    expect(catalogSection(entry('a', { popular: true }))).toBe('popular');
    expect(catalogSection(entry('a', { illustrated: true }))).toBe('others');
  });
});
