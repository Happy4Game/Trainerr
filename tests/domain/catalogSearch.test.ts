import { describe, expect, it } from 'vitest';
import { compareNames, matchesSearch, normalizeForSearch } from '@/domain/catalogSearch';

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
