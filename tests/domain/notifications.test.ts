import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFS,
  MAX_IGNORED_NUDGES,
  planNotifications,
  withDefaultKinds,
  type NotificationInput,
  type NotificationPrefs,
} from '@/domain/notifications';

/** Only the kinds asked, to test one at a time. */
const only = (...kinds: string[]): NotificationPrefs => ({
  ...DEFAULT_NOTIFICATION_PREFS,
  kinds: Object.fromEntries(
    Object.keys(DEFAULT_NOTIFICATION_PREFS.kinds).map((k) => [k, kinds.includes(k)]),
  ) as unknown as NotificationPrefs['kinds'],
});

function input(overrides: Partial<NotificationInput> = {}): NotificationInput {
  return {
    today: '2026-10-26',
    prefs: only('sessionReminder', 'nudge', 'tip'),
    plannedSessions: [{ date: '2026-10-26', start: '21:00', templateId: 'pushA' }],
    blockedSlots: [],
    lastSessionDate: '2026-10-24',
    sessionsPerWeek: 4,
    recentDiscomfort: false,
    ignoredNudges: 0,
    ...overrides,
  };
}

describe('motivation notifications', () => {
  it('reminds one hour before a planned session', () => {
    expect(planNotifications(input()).notifications).toEqual([
      {
        date: '2026-10-26',
        time: '20:00',
        kind: 'sessionReminder',
        templateId: 'pushA',
        sessionDate: '2026-10-26',
        sessionTime: '21:00',
      },
    ]);
  });

  it('never notifies during quiet hours (22:00–08:00 by default)', () => {
    const early = input({
      plannedSessions: [{ date: '2026-10-27', start: '08:30', templateId: 'pushA' }],
      blockedSlots: [{ weekday: 1, start: '19:00', end: '21:00' }],
    });
    expect(planNotifications(early).notifications).toEqual([]);
  });

  it('reminds an early-morning session the evening before, 7:30 being in the quiet hours', () => {
    const early = input({
      plannedSessions: [{ date: '2026-10-27', start: '08:30', templateId: 'pushA' }],
    });
    expect(planNotifications(early).notifications).toEqual([
      {
        date: '2026-10-26',
        time: '20:00',
        kind: 'sessionReminder',
        templateId: 'pushA',
        sessionDate: '2026-10-27',
        sessionTime: '08:30',
      },
    ]);
  });

  it('never plans a notification for a time already past: it would go off at once', () => {
    // 20:30: the 20:00 reminder of the 21:00 session is over.
    expect(planNotifications(input({ nowMinutes: 20 * 60 + 30 })).notifications).toEqual([]);
    expect(planNotifications(input({ nowMinutes: 19 * 60 })).notifications).toHaveLength(1);
  });

  it('never notifies during a blocked slot (class, other sport)', () => {
    const blocked = input({ blockedSlots: [{ weekday: 1, start: '19:30', end: '20:30' }] });
    expect(planNotifications(blocked).notifications).toEqual([]);
  });

  it('sends one reminder a day, and at most two notifications a day', () => {
    const plan = planNotifications(
      input({
        plannedSessions: [
          { date: '2026-10-26', start: '12:00', templateId: 'pushA' },
          { date: '2026-10-26', start: '21:00', templateId: 'pullA' },
        ],
      }),
    );
    expect(plan.notifications).toHaveLength(1);
    // Monday: the reminder, the week ahead, the weighing… only two go out.
    const busy = planNotifications(
      input({
        prefs: DEFAULT_NOTIFICATION_PREFS,
        today: '2026-10-25',
        lastSessionDate: '2026-10-24',
        plannedSessions: [{ date: '2026-10-26', start: '18:00', templateId: 'pushA' }],
        lastWeighingDate: '2026-10-19',
      }),
    ).notifications.filter((n) => n.date === '2026-10-26');
    expect(busy.map((n) => n.kind)).toEqual(['weekPlan', 'sessionReminder']);
  });

  it('sends a gentle nudge 3 days after the usual pace, in the evening', () => {
    // 4 sessions a week → one every 2 days; last session 5 days ago.
    const plan = planNotifications(
      input({ plannedSessions: [], lastSessionDate: '2026-10-21', today: '2026-10-26' }),
    );
    expect(plan.notifications).toEqual([
      { date: '2026-10-26', time: '18:00', kind: 'nudge', daysSince: 5 },
    ]);
  });

  it('plans the nudge ahead, for the day the pace slips, even if the app is not opened', () => {
    const plan = planNotifications(input({ plannedSessions: [], lastSessionDate: '2026-10-23' }));
    expect(plan.notifications).toEqual([
      { date: '2026-10-28', time: '18:00', kind: 'nudge', daysSince: 5 },
    ]);
  });

  it('puts the nudge off to the next day when 18:00 is past', () => {
    const plan = planNotifications(
      input({ plannedSessions: [], lastSessionDate: '2026-10-21', nowMinutes: 19 * 60 }),
    );
    expect(plan.notifications).toEqual([
      { date: '2026-10-27', time: '18:00', kind: 'nudge', daysSince: 6 },
    ]);
  });

  it('does not nudge when a session is planned before then: its reminder is enough', () => {
    const plan = planNotifications(input({ lastSessionDate: '2026-10-21' }));
    expect(plan.notifications.map((n) => n.kind)).toEqual(['sessionReminder']);
  });

  it('never nudges after a reported discomfort: rest comes first', () => {
    const plan = planNotifications(
      input({ plannedSessions: [], lastSessionDate: '2026-10-15', recentDiscomfort: true }),
    );
    expect(plan.notifications).toEqual([]);
  });

  it('offers to lower the frequency after 5 nudges without effect', () => {
    const plan = planNotifications(
      input({
        plannedSessions: [],
        lastSessionDate: '2026-10-15',
        ignoredNudges: MAX_IGNORED_NUDGES,
      }),
    );
    expect(plan).toEqual({ notifications: [], suggestFewerNudges: true });
  });

  it('respects the general switch and each kind switch', () => {
    expect(
      planNotifications(input({ prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: false } }))
        .notifications,
    ).toEqual([]);
    expect(
      planNotifications(
        input({
          prefs: only('nudge', 'tip'),
        }),
      ).notifications,
    ).toEqual([]);
  });

  it('sends the tip of the week on Sunday evening, unless Sunday already has one', () => {
    expect(
      planNotifications(input({ prefs: only('tip'), plannedSessions: [], tipId: 'protein' }))
        .notifications,
    ).toEqual([{ date: '2026-11-01', time: '18:00', kind: 'tip', tipId: 'protein' }]);
    expect(
      planNotifications(
        input({
          prefs: only('sessionReminder', 'tip'),
          plannedSessions: [{ date: '2026-11-01', start: '19:00', templateId: 'pushA' }],
          blockedSlots: [{ weekday: 7, start: '17:30', end: '18:30' }],
          lastSessionDate: '2026-10-25',
          tipId: 'protein',
        }),
      ).notifications.map((n) => n.kind),
    ).toEqual(['sessionReminder']);
  });

  it('tells the week ahead on Monday morning: how many sessions, and the first one', () => {
    const plan = planNotifications(
      input({
        prefs: only('weekPlan'),
        today: '2026-10-29',
        plannedSessions: [
          { date: '2026-10-30', start: '18:00', templateId: 'pushA' },
          { date: '2026-11-03', start: '18:00', templateId: 'pullA' },
          { date: '2026-11-05', start: '12:00', templateId: 'legsA' },
        ],
      }),
    );
    expect(plan.notifications).toEqual([
      {
        date: '2026-11-02',
        time: '08:30',
        kind: 'weekPlan',
        count: 2,
        first: { date: '2026-11-03', time: '18:00', templateId: 'pullA' },
      },
    ]);
  });

  it('reminds the weighing a week after the last one, only to those who weigh themselves', () => {
    const weighIn = (lastWeighingDate?: string) =>
      planNotifications(
        input({
          prefs: only('weighIn'),
          ...(lastWeighingDate ? { lastWeighingDate } : {}),
        }),
      ).notifications;
    expect(weighIn()).toEqual([]);
    expect(weighIn('2026-10-22')).toEqual([{ date: '2026-10-29', time: '08:30', kind: 'weighIn' }]);
    // Late already: tomorrow morning, 08:30 being past today.
    expect(
      planNotifications(
        input({ prefs: only('weighIn'), lastWeighingDate: '2026-10-01', nowMinutes: 600 }),
      ).notifications,
    ).toEqual([{ date: '2026-10-27', time: '08:30', kind: 'weighIn' }]);
  });

  it('suggests a new body photo 4 weeks after the last one', () => {
    const plan = planNotifications(input({ prefs: only('photo'), lastPhotoDate: '2026-10-01' }));
    expect(plan.notifications).toEqual([
      { date: '2026-10-29', time: '10:00', kind: 'photo', weeksSince: 4 },
    ]);
  });

  it('turns on the kinds added since the settings were saved, drops the removed ones', () => {
    const old = {
      enabled: true,
      kinds: { sessionReminder: false, nudge: true, record: true, tip: false },
      quietHours: { start: '23:00', end: '07:00' },
    } as unknown as NotificationPrefs;
    expect(withDefaultKinds(old)).toEqual({
      enabled: true,
      kinds: {
        sessionReminder: false,
        nudge: true,
        weekPlan: true,
        weighIn: true,
        photo: true,
        tip: false,
      },
      quietHours: { start: '23:00', end: '07:00' },
    });
    expect(withDefaultKinds(undefined).enabled).toBe(false);
  });

  it('ignores sessions in the past', () => {
    const plan = planNotifications(
      input({
        prefs: only('sessionReminder'),
        plannedSessions: [{ date: '2026-10-25', start: '21:00', templateId: 'pushA' }],
      }),
    );
    expect(plan.notifications).toEqual([]);
  });
});
