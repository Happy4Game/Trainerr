import { describe, expect, it } from 'vitest';
import licenses from '@/data/content/licenses.json';
import { SOURCES, sourceById } from '@/data/content/sources';
import { TIPS } from '@/data/content/tips';
import fr from '@/i18n/locales/fr-FR.json';

describe('content pages', () => {
  it('every tip has its text, and its sources exist', () => {
    const items = fr.tips.items as Record<string, { title: string; body: string }>;
    for (const tip of TIPS) {
      expect(items[tip.id]?.title, tip.id).toBeTruthy();
      for (const id of tip.sourceIds) expect(sourceById(id), id).toBeDefined();
      expect(tip.status === 'sourced').toBe(tip.sourceIds.length > 0);
    }
  });

  it('every source has a link', () => {
    for (const source of SOURCES) expect(source.url).toMatch(/^https?:\/\//);
  });

  it('only ships libraries under accepted licenses', () => {
    expect(licenses.length).toBeGreaterThan(50);
    for (const lib of licenses) {
      expect(lib.license, lib.name).not.toMatch(/GPL(?!-3\.0-or-later\))|AGPL|MPL|UNKNOWN/);
    }
  });
});
