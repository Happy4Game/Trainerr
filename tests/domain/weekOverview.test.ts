import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '@/domain/planning';
import type { SessionLog } from '@/domain/types';
import { weekOverview } from '@/domain/weekOverview';

const planned = (date: string, templateId: string): PlannedSession => ({
  date,
  weekday: 0,
  start: '18:00',
  end: '19:00',
  templateId,
});
const done = (date: string, templateId: string): SessionLog => ({
  id: date,
  date,
  templateId,
  sets: [],
});

// Monday 19 to Sunday 25 October 2026.
const days = [
  { date: '2026-10-19', session: planned('2026-10-19', 'push-a') },
  { date: '2026-10-20' },
  { date: '2026-10-21', session: planned('2026-10-21', 'pull-a') },
  { date: '2026-10-22', session: planned('2026-10-22', 'legs-a') },
  { date: '2026-10-23' },
  { date: '2026-10-24', session: planned('2026-10-24', 'push-b') },
  { date: '2026-10-25' },
];

describe('weekOverview', () => {
  it('marks done, missed, today, planned and rest days', () => {
    const week = weekOverview({
      days,
      done: [done('2026-10-19', 'push-a')],
      today: '2026-10-22',
    });
    expect(week.days.map((d) => d.status)).toEqual([
      'done',
      'rest',
      'missed',
      'today',
      'rest',
      'planned',
      'rest',
    ]);
    expect(week.doneCount).toBe(1);
    expect(week.next).toEqual(planned('2026-10-22', 'legs-a'));
  });

  it('a session done on a free day counts and shows what was done', () => {
    const week = weekOverview({
      days,
      done: [done('2026-10-20', 'pull-a')],
      today: '2026-10-20',
    });
    expect(week.days[1]).toMatchObject({ status: 'done', doneTemplateId: 'pull-a' });
    expect(week.doneCount).toBe(1);
    expect(week.next?.date).toBe('2026-10-21');
  });

  it('today is done once the session is finished, the next one comes after', () => {
    const week = weekOverview({
      days,
      done: [done('2026-10-22', 'legs-a')],
      today: '2026-10-22',
    });
    expect(week.days[3]?.status).toBe('done');
    expect(week.next?.date).toBe('2026-10-24');
  });

  it('ignores sessions outside the week and has no next session at its end', () => {
    const week = weekOverview({
      days,
      done: [done('2026-10-12', 'push-a'), done('2026-10-26', 'push-a')],
      today: '2026-10-25',
    });
    expect(week.doneCount).toBe(0);
    expect(week.next).toBeUndefined();
  });
});
