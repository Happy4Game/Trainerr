import { describe, expect, it } from 'vitest';
import { CHANGELOG } from '@/data/content/changelog';
import licenses from '@/data/content/licenses.json';
import { SOURCES, sourceById } from '@/data/content/sources';
import { TIPS } from '@/data/content/tips';
import en from '@/i18n/locales/en-US.json';
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

  it('every change in "What\'s new" has its title and texts, newest first', () => {
    for (const { titles, items } of [fr.changelog, en.changelog]) {
      for (const entry of CHANGELOG) {
        expect((titles as Record<string, string>)[entry.id], entry.id).toBeTruthy();
        for (const item of entry.items) {
          expect((items as Record<string, string>)[item], item).toBeTruthy();
        }
      }
    }
    const dates = CHANGELOG.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(CHANGELOG.map((entry) => entry.id)).size).toBe(CHANGELOG.length);
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
