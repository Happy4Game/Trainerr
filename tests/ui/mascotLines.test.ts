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
    expect(coachLine({ ...base, setsLeftHere: 0 })).toEqual({ key: 'rest', variant: 1 });
  });
});
