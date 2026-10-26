import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFS,
  MAX_IGNORED_NUDGES,
  planNotifications,
  type NotificationInput,
} from '@/domain/notifications';

function input(overrides: Partial<NotificationInput> = {}): NotificationInput {
  return {
    today: '2026-10-26',
    prefs: DEFAULT_NOTIFICATION_PREFS,
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
      { date: '2026-10-26', time: '20:00', kind: 'sessionReminder', templateId: 'pushA' },
    ]);
  });

  it('never notifies during quiet hours (22:00–08:00 by default)', () => {
    const early = input({
      plannedSessions: [{ date: '2026-10-26', start: '08:30', templateId: 'pushA' }],
    });
    expect(planNotifications(early).notifications).toEqual([]);
  });

  it('never notifies during a blocked slot (class, other sport)', () => {
    const blocked = input({ blockedSlots: [{ weekday: 1, start: '19:30', end: '20:30' }] });
    expect(planNotifications(blocked).notifications).toEqual([]);
  });

  it('sends at most one notification a day', () => {
    const plan = planNotifications(
      input({
        plannedSessions: [
          { date: '2026-10-26', start: '12:00', templateId: 'pushA' },
          { date: '2026-10-26', start: '21:00', templateId: 'pullA' },
        ],
      }),
    );
    expect(plan.notifications).toHaveLength(1);
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

  it('does not nudge before that', () => {
    const plan = planNotifications(input({ plannedSessions: [], lastSessionDate: '2026-10-23' }));
    expect(plan.notifications).toEqual([]);
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
          prefs: {
            ...DEFAULT_NOTIFICATION_PREFS,
            kinds: { ...DEFAULT_NOTIFICATION_PREFS.kinds, sessionReminder: false },
          },
        }),
      ).notifications,
    ).toEqual([]);
  });

  it('sends the tip of the week on Sunday evening, unless Sunday already has one', () => {
    expect(
      planNotifications(
        input({ plannedSessions: [], lastSessionDate: '2026-10-25', tipId: 'protein' }),
      ).notifications,
    ).toEqual([{ date: '2026-11-01', time: '18:00', kind: 'tip', tipId: 'protein' }]);
    expect(
      planNotifications(
        input({
          plannedSessions: [{ date: '2026-11-01', start: '10:00', templateId: 'pushA' }],
          lastSessionDate: '2026-10-25',
          tipId: 'protein',
        }),
      ).notifications.map((n) => n.kind),
    ).toEqual(['sessionReminder']);
  });

  it('ignores sessions in the past', () => {
    const plan = planNotifications(
      input({ plannedSessions: [{ date: '2026-10-25', start: '21:00', templateId: 'pushA' }] }),
    );
    expect(plan.notifications).toEqual([]);
  });
});
