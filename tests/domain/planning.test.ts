import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { timeToMinutes } from '@/domain/dates';
import { nextTemplate, planWeek, type PlanningInput, type WeeklySlot } from '@/domain/planning';
import { rotationFor } from '@/domain/trainingModels';

const weekStart = '2026-10-26'; // Monday
const everyEvening: WeeklySlot[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  start: '19:00',
  end: '22:00',
}));

function input(overrides: Partial<PlanningInput> = {}): PlanningInput {
  return {
    weekStart,
    rotation: rotationFor('ppl'),
    sessionsPerWeek: 6,
    sessionMinutes: 60,
    freeSlots: everyEvening,
    blockedSlots: [],
    quietHours: { start: '22:00', end: '08:00' },
    otherSports: [],
    ...overrides,
  };
}

describe('next session (continuous rotation)', () => {
  const ppl = rotationFor('ppl');

  it('follows the last session done, not the calendar', () => {
    expect(nextTemplate(ppl, 'pushA').id).toBe('pullA');
    expect(nextTemplate(ppl, 'legsB').id).toBe('pushA');
  });

  it('starts at the beginning without history, or with an unknown template', () => {
    expect(nextTemplate(ppl, undefined).id).toBe('pushA');
    expect(nextTemplate(ppl, 'upperA').id).toBe('pushA');
  });
});

describe('weekly planning', () => {
  it('generates the spec example: Push A → Legs B, Sunday off', () => {
    const plan = planWeek(input());
    expect(plan.sessions.map((s) => [s.date, s.templateId])).toEqual([
      ['2026-10-26', 'pushA'],
      ['2026-10-27', 'pullA'],
      ['2026-10-28', 'legsA'],
      ['2026-10-29', 'pushB'],
      ['2026-10-30', 'pullB'],
      ['2026-10-31', 'legsB'],
    ]);
    expect(plan.sessions[0]).toMatchObject({ start: '19:00', end: '20:00' });
    expect(plan.unplaced).toBe(0);
  });

  it('continues the rotation from the last session done', () => {
    const plan = planWeek(input({ lastDoneTemplateId: 'pullA', sessionsPerWeek: 3 }));
    expect(plan.sessions.map((s) => s.templateId)).toEqual(['legsA', 'pushB', 'pullB']);
  });

  it('always keeps at least one full rest day', () => {
    const plan = planWeek(input({ sessionsPerWeek: 7 }));
    expect(plan.sessions).toHaveLength(6);
  });

  it('spreads fewer sessions over the week', () => {
    const plan = planWeek(input({ rotation: rotationFor('upperLower'), sessionsPerWeek: 4 }));
    expect(plan.sessions.map((s) => s.weekday)).toEqual([1, 2, 4, 6]);
  });

  it('skips blocked slots and starts after them', () => {
    const plan = planWeek(
      input({
        sessionsPerWeek: 1,
        blockedSlots: [{ weekday: 1, start: '18:00', end: '20:30' }],
      }),
    );
    expect(plan.sessions[0]).toMatchObject({ weekday: 1, start: '20:30', end: '21:30' });
  });

  it('never runs into quiet hours', () => {
    const plan = planWeek(
      input({
        sessionsPerWeek: 1,
        sessionMinutes: 90,
        freeSlots: [{ weekday: 1, start: '21:00', end: '23:30' }],
      }),
    );
    expect(plan.sessions).toEqual([]);
    expect(plan.unplaced).toBe(1);
  });

  it('cycling: no Legs on the ride day nor the day after', () => {
    const plan = planWeek(
      input({
        otherSports: [{ sport: 'cycling', slots: [{ weekday: 3, start: '12:00', end: '14:00' }] }],
      }),
    );
    const legsDays = plan.sessions
      .filter((s) => s.templateId.startsWith('legs'))
      .map((s) => s.weekday);
    expect(legsDays).not.toContain(3);
    expect(legsDays).not.toContain(4);
    expect(plan.sessions).toHaveLength(6);
  });

  it('a sport session blocks its own time slot', () => {
    const plan = planWeek(
      input({
        sessionsPerWeek: 1,
        otherSports: [{ sport: 'other', slots: [{ weekday: 1, start: '19:00', end: '21:00' }] }],
      }),
    );
    expect(plan.sessions[0]).toMatchObject({ weekday: 1, start: '21:00' });
  });

  it('combat sports keep Push away from training days', () => {
    const plan = planWeek(
      input({
        sessionsPerWeek: 3,
        otherSports: [{ sport: 'combat', slots: [{ weekday: 1, start: '12:00', end: '13:00' }] }],
      }),
    );
    const pushDays = plan.sessions
      .filter((s) => s.templateId.startsWith('push'))
      .map((s) => s.weekday);
    for (const day of [7, 1, 2]) expect(pushDays).not.toContain(day);
  });

  it('reports sessions that cannot be placed', () => {
    const plan = planWeek(input({ freeSlots: everyEvening.slice(0, 2) }));
    expect(plan.sessions).toHaveLength(2);
    expect(plan.unplaced).toBe(4);
  });

  describe('properties', () => {
    const time = fc.integer({ min: 0, max: 95 }).map((quarter) => quarter * 15);
    const slot = fc
      .record({ weekday: fc.integer({ min: 1, max: 7 }), a: time, b: time })
      .filter(({ a, b }) => a !== b)
      .map(({ weekday, a, b }) => ({
        weekday,
        start: toTime(Math.min(a, b)),
        end: toTime(Math.max(a, b)),
      }));
    const planning = fc.record({
      freeSlots: fc.array(slot, { maxLength: 10 }),
      blockedSlots: fc.array(slot, { maxLength: 6 }),
      sessionsPerWeek: fc.integer({ min: 1, max: 7 }),
      sessionMinutes: fc.constantFrom(30, 45, 60, 90),
    });

    it('never places a session in a blocked slot, in quiet hours, or outside free time', () => {
      fc.assert(
        fc.property(planning, (p) => {
          const plan = planWeek(input(p));
          for (const session of plan.sessions) {
            const start = timeToMinutes(session.start);
            const end = timeToMinutes(session.end);
            expect(end - start).toBe(p.sessionMinutes);
            expect(start).toBeGreaterThanOrEqual(timeToMinutes('08:00'));
            expect(end).toBeLessThanOrEqual(timeToMinutes('22:00'));
            for (const blocked of p.blockedSlots.filter((b) => b.weekday === session.weekday)) {
              const overlaps =
                start < timeToMinutes(blocked.end) && timeToMinutes(blocked.start) < end;
              expect(overlaps).toBe(false);
            }
            const insideFree = p.freeSlots.some(
              (free) =>
                free.weekday === session.weekday &&
                timeToMinutes(free.start) <= start &&
                end <= timeToMinutes(free.end),
            );
            expect(insideFree).toBe(true);
          }
          const days = new Set(plan.sessions.map((s) => s.weekday));
          expect(days.size).toBe(plan.sessions.length); // at most one session a day
          expect(days.size).toBeLessThanOrEqual(6); // at least one rest day
        }),
      );
    });
  });
});

function toTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}
