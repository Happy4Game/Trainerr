import { templateName } from '@/domain/templateName';
import { LocalNotifications } from '@capacitor/local-notifications';
import { openAppDatabase } from '@/data/appDatabase';
import { listDoneSessions } from '@/data/repositories/sessionRepository';
import { listMeasurements } from '@/data/repositories/bodyRepository';
import { getSettings, type Settings } from '@/data/repositories/settingsRepository';
import { addDays, daysBetween, startOfWeek } from '@/domain/dates';
import { planNotifications, type PlannedNotification } from '@/domain/notifications';
import { dueTemplate, planFromToday } from '@/domain/planning';
import { rotationFor } from '@/domain/trainingModels';
import { TIPS } from '@/data/content/tips';
import { i18n } from '@/i18n';
import {
  AUTO_FINISH_NOTIFICATION_ID,
  REST_END_NOTIFICATION_ID,
} from '@/ui/session/sessionNotification';

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

/** Where a tap on each kind of notification leads. */
const ROUTES: Record<PlannedNotification['kind'], string> = {
  sessionReminder: '/tabs/today',
  nudge: '/tabs/today',
  weekPlan: '/tabs/planning',
  weighIn: '/tabs/history?view=body',
  photo: '/tabs/history/photos',
  tip: '/tabs/settings/tips',
};

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Replaces the scheduled local notifications by those of the next 7 days.
 * Everything stays on the phone: no server, no data sent.
 */
export async function rescheduleNotifications(settings: Settings): Promise<void> {
  try {
    // The alerts of a session in progress (end of rest, closed by itself) are not reminders: they stay.
    const pending = (await LocalNotifications.getPending()).notifications.filter(
      (n) => n.id !== REST_END_NOTIFICATION_ID && n.id !== AUTO_FINISH_NOTIFICATION_ID,
    );
    if (pending.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
    }
    if (!settings.notifications.enabled) return;

    const { db } = await openAppDatabase();
    const done = await listDoneSessions(db);
    const body = await listMeasurements(db);
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
    const lastWeighing = body.filter((m) => m.weightKg !== undefined).at(-1)?.date;
    const lastPhoto = body.filter((m) => m.photo).at(-1)?.date;
    const { notifications } = planNotifications({
      today: date,
      nowMinutes: nowMinutes(),
      prefs: settings.notifications,
      plannedSessions: [...weeks.thisWeek.sessions, ...weeks.nextWeek.sessions],
      blockedSlots: [...settings.blockedSlots, ...(settings.otherSport?.slots ?? [])],
      ...(last ? { lastSessionDate: last.date } : {}),
      ...(lastWeighing ? { lastWeighingDate: lastWeighing } : {}),
      ...(lastPhoto ? { lastPhotoDate: lastPhoto } : {}),
      sessionsPerWeek: settings.sessionsPerWeek,
      // Rest comes first: no nudge in the 3 days after a reported discomfort.
      recentDiscomfort: (settings.discomforts ?? []).some((d) => daysBetween(d.date, date) <= 3),
      ignoredNudges: 0,
      // A different card each week.
      tipId: TIPS[Math.floor(Date.parse(date) / (7 * 86_400_000)) % TIPS.length]?.id ?? 'protein',
    });
    if (notifications.length === 0) return;
    await LocalNotifications.schedule({
      notifications: notifications.map((n, index) => ({
        id: index + 1,
        title: 'Trainerr',
        body: notificationText(n, settings),
        // Doze mode (screen off for a while) would delay it otherwise.
        schedule: { at: new Date(`${n.date}T${n.time}:00`), allowWhileIdle: true },
        extra: { route: ROUTES[n.kind] },
      })),
    });
  } catch (error) {
    // Notifications are a comfort: a failure must never block the app.
    console.warn('Notifications non programmées', error);
  }
}

/** Plans them again from the saved settings: at launch, and when the app comes back. */
export async function refreshNotifications(): Promise<void> {
  try {
    const { db } = await openAppDatabase();
    const settings = await getSettings(db);
    if (settings.onboarded && settings.notifications.enabled) {
      await rescheduleNotifications(settings);
    }
  } catch {
    // Same as above: never blocks the app.
  }
}

/** A tap on a notification opens the matching screen. */
export async function onNotificationTap(open: (route: string) => void): Promise<void> {
  try {
    await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      const route: unknown = notification.extra?.route;
      if (typeof route === 'string' && route.startsWith('/tabs/')) open(route);
    });
  } catch {
    // Browser without notifications: nothing to listen to.
  }
}

function notificationText(n: PlannedNotification, settings: Settings): string {
  const t = i18n.global.t;
  const name = (templateId: string) =>
    templateName(templateId, {
      translate: (key) => t(key),
      custom: settings.customSessions ?? [],
      fallback: t('customSession.deleted'),
    });
  const weekday = (date: string) =>
    new Intl.DateTimeFormat(String(i18n.global.locale.value), {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
  switch (n.kind) {
    case 'sessionReminder':
      return t(n.sessionDate === n.date ? 'notifications.reminder' : 'notifications.eve', {
        template: name(n.templateId),
        time: n.sessionTime,
      });
    case 'nudge':
      return t('notifications.nudge', { days: n.daysSince });
    case 'weekPlan':
      return t(
        'notifications.weekPlan',
        {
          count: n.count,
          template: name(n.first.templateId),
          day: weekday(n.first.date),
          time: n.first.time,
        },
        n.count,
      );
    case 'weighIn':
      return t('notifications.weighIn');
    case 'photo':
      return t('notifications.photo', { weeks: n.weeksSince });
    case 'tip':
      return t('notifications.tip', { title: t(`tips.items.${n.tipId}.title`) });
  }
}
