import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Notification of the session in progress (Android): exercise, set and rest
 * countdown, always visible, plus an alert at the end of the rest. Nothing
 * leaves the phone. In the browser, the in-app timer is enough.
 */
interface SessionNotificationPlugin {
  show(options: {
    title: string;
    body: string;
    restEndsAt?: number;
    channelName: string;
  }): Promise<{ shown?: boolean } | undefined>;
  hide(): Promise<void>;
}

const SessionNotification = registerPlugin<SessionNotificationPlugin>('SessionNotification');

/** Kept apart from the reminder ids, which are rescheduled as a whole. */
export const REST_END_NOTIFICATION_ID = 2_000_000_001;
const REST_END_CHANNEL = 'rest-end';

const available = () => Capacitor.getPlatform() === 'android';

let permissionAsked = false;

/** Android 13+ asks once, when the first session starts (the moment it is useful). */
export async function ensureSessionNotificationPermission(): Promise<boolean> {
  if (!available()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    if (permissionAsked || display === 'denied') return false;
    permissionAsked = true;
    return (await LocalNotifications.requestPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

export async function showSessionNotification(content: {
  title: string;
  body: string;
  restEndsAt?: number;
  channelName: string;
}): Promise<void> {
  if (!available()) return;
  try {
    await SessionNotification.show(content);
  } catch {
    // A missing notification never stops the session.
  }
}

export async function hideSessionNotification(): Promise<void> {
  if (!available()) return;
  try {
    await SessionNotification.hide();
    await cancelRestEnd();
  } catch {
    // Nothing to hide.
  }
}

/** Alert at the end of the rest, even with the screen off: sound and vibration. */
export async function scheduleRestEnd(
  endsAt: number,
  text: { title: string; body: string; channelName: string },
): Promise<void> {
  if (!available()) return;
  try {
    await LocalNotifications.createChannel({
      id: REST_END_CHANNEL,
      name: text.channelName,
      importance: 5,
      vibration: true,
      visibility: 1,
    });
    await cancelRestEnd();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_END_NOTIFICATION_ID,
          title: text.title,
          body: text.body,
          channelId: REST_END_CHANNEL,
          smallIcon: 'ic_stat_trainerr',
          autoCancel: true,
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    // The in-app timer still vibrates when the app is open.
  }
}

export async function cancelRestEnd(): Promise<void> {
  if (!available()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_END_NOTIFICATION_ID }] });
  } catch {
    // Nothing scheduled.
  }
}
