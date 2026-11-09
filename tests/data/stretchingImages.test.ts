import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allStretchingIllustrations } from '@/data/catalog/exerciseImages';
import { STRETCHES } from '@/domain/stretching';

const FREE_LICENSES = /^(CC0|Public domain|CC BY( |-SA )\d\.\d)$/;

describe('stretch illustrations', () => {
  it('belong to a stretch, exist on disk, and carry a free license and an author', () => {
    const ids = new Set(STRETCHES.map((s) => s.id));
    for (const [id, illustration] of Object.entries(allStretchingIllustrations())) {
      expect(ids.has(id)).toBe(true);
      expect(illustration.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      for (const image of illustration.images) {
        expect(existsSync(resolve('public/exercise-images', image.file))).toBe(true);
        expect(image.license).toMatch(FREE_LICENSES);
        expect(image.author.length).toBeGreaterThan(0);
      }
    }
  });

  it('come from as few sources as possible: one author, one license', () => {
    const images = Object.values(allStretchingIllustrations()).flatMap((i) => i.images);
    expect(new Set(images.map((i) => i.author)).size).toBe(1);
    expect(new Set(images.map((i) => i.license)).size).toBe(1);
  });
});
