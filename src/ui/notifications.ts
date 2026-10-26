import { templateName } from '@/domain/templateName';
import { LocalNotifications } from '@capacitor/local-notifications';
import { openAppDatabase } from '@/data/appDatabase';
import { listDoneSessions } from '@/data/repositories/sessionRepository';
import type { Settings } from '@/data/repositories/settingsRepository';
import { addDays, daysBetween, startOfWeek } from '@/domain/dates';
import { planNotifications } from '@/domain/notifications';
import { dueTemplate, planFromToday } from '@/domain/planning';
import { rotationFor } from '@/domain/trainingModels';
import { TIPS } from '@/data/content/tips';
import { i18n } from '@/i18n';

/** Asked after the questionnaire only, with a sentence explaining what they are for. */
export async function askNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * Replaces the scheduled local notifications by those of the next 7 days.
 * Everything stays on the phone: no server, no data sent.
 */
export async function rescheduleNotifications(settings: Settings): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
    if (!settings.notifications.enabled) return;

    const { db } = await openAppDatabase();
    const done = await listDoneSessions(db);
    const last = done.at(-1);
    const rotation = rotationFor(settings.model);
    const date = today();
    const monday = startOfWeek(date);
    const rotationDone = [...done]
      .reverse()
      .find((h) => rotation.some((t) => t.id === h.templateId));
    const weeks = planFromToday({
      today: date,
      rotation,
      nextTemplateId: dueTemplate(rotation, rotationDone, settings.nextChoice).id,
      doneDates: done.map((h) => h.date).filter((d) => d >= monday && d < addDays(monday, 7)),
      sessionsPerWeek: settings.sessionsPerWeek,
      sessionMinutes: settings.sessionMinutes,
      freeSlots: settings.freeSlots,
      blockedSlots: settings.blockedSlots,
      otherSports: settings.otherSport ? [settings.otherSport] : [],
    });
    const plannedSessions = [...weeks.thisWeek.sessions, ...weeks.nextWeek.sessions];
    const { notifications } = planNotifications({
      today: date,
      prefs: settings.notifications,
      plannedSessions: plannedSessions.filter((s) => s.date < addDays(date, 7)),
      blockedSlots: [...settings.blockedSlots, ...(settings.otherSport?.slots ?? [])],
      ...(last ? { lastSessionDate: last.date } : {}),
      sessionsPerWeek: settings.sessionsPerWeek,
      // Rest comes first: no nudge in the 3 days after a reported discomfort.
      recentDiscomfort: (settings.discomforts ?? []).some((d) => daysBetween(d.date, date) <= 3),
      ignoredNudges: 0,
      // A different card each week.
      tipId: TIPS[Math.floor(Date.parse(date) / (7 * 86_400_000)) % TIPS.length]?.id ?? 'protein',
    });
    const t = i18n.global.t;
    await LocalNotifications.schedule({
      notifications: notifications.map((n, index) => ({
        id: index + 1,
        title: 'Trainerr',
        body:
          n.kind === 'sessionReminder'
            ? t('notifications.reminder', {
                template: templateName(n.templateId, {
                  translate: (key) => t(key),
                  custom: settings.customSessions ?? [],
                  fallback: t('customSession.deleted'),
                }),
                time: addMinutes(n.time, 60),
              })
            : n.kind === 'nudge'
              ? t('notifications.nudge', { days: n.daysSince })
              : t('notifications.tip', { title: t(`tips.items.${n.tipId}.title`) }),
        schedule: { at: new Date(`${n.date}T${n.time}:00`) },
      })),
    });
  } catch (error) {
    // Notifications are a comfort: a failure must never block the app.
    console.warn('Notifications non programmées', error);
  }
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number) as [number, number];
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
