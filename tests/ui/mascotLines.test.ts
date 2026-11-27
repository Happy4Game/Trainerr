import { describe, expect, it } from 'vitest';
import { TIPS } from '@/data/content/tips';
import { coachLine, MASCOT_TIPS, tipOfTheDay } from '@/ui/decor/mascotLines';

describe('mascot lines', () => {
  it('only gives tips that have a source', () => {
    expect(MASCOT_TIPS.length).toBeGreaterThan(0);
    for (const id of MASCOT_TIPS) {
      expect(TIPS.find((tip) => tip.id === id)?.status).toBe('sourced');
    }
  });

  it('keeps the same tip all day, and changes the next day', () => {
    expect(tipOfTheDay('2026-11-26')).toBe(tipOfTheDay('2026-11-26'));
    expect(tipOfTheDay('2026-11-27')).not.toBe(tipOfTheDay('2026-11-26'));
    expect(tipOfTheDay('2026-11-26', 1)).toBe(tipOfTheDay('2026-11-27'));
  });

  it('says the most telling thing first', () => {
    const base = { recordBeaten: false, setsLeftHere: 2, machinesLeft: 3, setsDone: 4 };
    expect(coachLine({ ...base, recordBeaten: true })).toEqual({ key: 'record' });
    expect(coachLine({ ...base, machinesLeft: 0, setsLeftHere: 1 })).toEqual({ key: 'lastSet' });
    expect(coachLine({ ...base, machinesLeft: 0 })).toEqual({ key: 'lastMachine' });
    expect(coachLine(base)).toEqual({ key: 'setsLeft', count: 2 });
    expect(coachLine({ ...base, setsLeftHere: 0 })).toEqual({ key: 'rest', variant: 4 });
  });
});

describe('celebrations', () => {
  it('each moment has its lines in both languages', async () => {
    const { CELEBRATIONS } = await import('@/ui/decor/mascotLines');
    const fr = (await import('@/i18n/locales/fr-FR.json')).default;
    const en = (await import('@/i18n/locales/en-US.json')).default;
    for (const [kind, style] of Object.entries(CELEBRATIONS)) {
      for (const locale of [fr, en]) {
        const lines = (locale.decor.celebrations as Record<string, Record<string, string>>)[kind];
        expect(Object.keys(lines ?? {})).toHaveLength(style.lines);
      }
    }
  });

  it('draws pose, entrance and line from the moment', async () => {
    const { celebrationFor } = await import('@/ui/decor/celebrate');
    const first = celebrationFor('record', 1, () => 0);
    expect(first).toMatchObject({
      pose: 'trophy',
      entrance: 'hop',
      line: 'decor.celebrations.record.0',
    });
    const last = celebrationFor('record', 2, () => 0.99);
    expect(last).toMatchObject({
      pose: 'cheer',
      entrance: 'pop',
      line: 'decor.celebrations.record.2',
    });
    expect(celebrationFor('session', 3, () => 0.5).confetti).toBe(true);
  });
});
