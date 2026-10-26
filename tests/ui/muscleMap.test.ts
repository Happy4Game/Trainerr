import { describe, expect, it } from 'vitest';
import { MUSCLES } from '@/domain/muscles';
import bodyPaths from '@/ui/muscleMap/bodyPaths.json';
import { highlightedParts, MUSCLE_SLUGS, musclesAt } from '@/ui/muscleMap/muscleSlugs';

const slugs = {
  front: new Set(bodyPaths.front.parts.map((p) => p.slug)),
  back: new Set(bodyPaths.back.parts.map((p) => p.slug)),
};

describe('muscle map', () => {
  it('draws every muscle of the app on the silhouette', () => {
    for (const muscle of MUSCLES) {
      const parts = MUSCLE_SLUGS[muscle];
      expect(parts.length, muscle).toBeGreaterThan(0);
      for (const { view, slug } of parts)
        expect(slugs[view], `${muscle} → ${slug}`).toContain(slug);
    }
  });

  it('colours primary muscles over secondary ones', () => {
    const parts = highlightedParts(['chest'], ['frontDelts', 'chest', 'triceps']);
    expect(parts.get('front:chest')).toBe('primary');
    expect(parts.get('front:deltoids')).toBe('secondary');
    expect(parts.get('back:triceps')).toBe('secondary');
    expect(parts.has('back:gluteal')).toBe(false);
  });
});

describe('body zones that can be touched to search', () => {
  it('gives the muscles drawn on a zone', () => {
    expect(musclesAt('front', 'chest')).toEqual(['chest']);
    expect(musclesAt('front', 'deltoids')).toEqual(['frontDelts', 'sideDelts']);
    expect(musclesAt('back', 'upper-back')).toEqual(['lats', 'upperBack']);
    expect(musclesAt('back', 'gluteal')).toEqual(['glutes', 'abductors']);
  });

  it('has nothing for zones without a muscle of the app', () => {
    expect(musclesAt('front', 'head')).toEqual([]);
  });
});
