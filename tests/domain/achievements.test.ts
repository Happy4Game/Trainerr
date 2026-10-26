import { describe, expect, it } from 'vitest';
import { earnedBadges, newRecords } from '@/domain/achievements';
import type { SessionLog } from '@/domain/types';
import { octoberSessions } from '../fixtures/octoberSessions';

const previous = octoberSessions.slice(0, -1);
const last = octoberSessions.at(-1) as SessionLog;

describe('records', () => {
  it('leg press 107 kg × 10 on 24 October beats the 100 kg of the 17th', () => {
    expect(newRecords(previous, last)).toEqual([
      { exerciseId: 'leg-press', loadKg: 107, reps: 10 },
    ]);
  });

  it('a first time on an exercise is not a record', () => {
    expect(newRecords([], octoberSessions[0] as SessionLog)).toEqual([]);
  });

  it('a lighter session beats nothing', () => {
    const light: SessionLog = {
      id: 'x',
      date: '2026-10-26',
      templateId: 'legsA',
      sets: [{ exerciseId: 'leg-press', loadKg: 90, reps: 10, difficulty: 'ok' }],
    };
    expect(newRecords(octoberSessions, light)).toEqual([]);
  });
});

describe('badges', () => {
  it('rewards the first session, the pace and records', () => {
    expect(
      earnedBadges({
        sessions: octoberSessions,
        sessionsPerWeek: 3,
        today: '2026-10-24',
        recordsBeaten: 1,
        backToLevelReached: false,
      }),
    ).toEqual(['firstSession', 'firstWeekOnPace', 'firstRecord']);
  });

  it('adds the milestones', () => {
    const many: SessionLog[] = Array.from({ length: 50 }, (_, i) => ({
      id: `s${i}`,
      date: `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
      templateId: 'pushA',
      sets: [],
    }));
    expect(
      earnedBadges({
        sessions: many,
        sessionsPerWeek: 3,
        today: '2026-02-28',
        recordsBeaten: 0,
        backToLevelReached: true,
      }),
    ).toEqual([
      'firstSession',
      'tenSessions',
      'fiftySessions',
      'firstWeekOnPace',
      'fourWeeksOnPace',
      'backToLevel',
    ]);
  });
});
