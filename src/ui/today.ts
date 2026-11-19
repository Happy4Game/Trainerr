import { ref } from 'vue';
import { localIsoDate } from '@/domain/dates';

/**
 * Today's date on the phone, as a reactive value: a `computed` that reads
 * `todayIso()` is computed again when the day changes. A plain function would
 * not be: Vue caches a computed until one of its reactive dependencies
 * changes (https://vuejs.org/guide/essentials/computed.html#computed-caching-vs-methods),
 * so an app left open overnight kept showing the day before.
 */
const today = ref(localIsoDate(new Date()));

export function todayIso(): string {
  return today.value;
}

/** Reads the phone clock again; the value only changes when the day has. */
export function refreshToday(now = new Date()): void {
  const date = localIsoDate(now);
  if (date !== today.value) today.value = date;
}

let midnight: ReturnType<typeof setTimeout> | undefined;

/**
 * Keeps today up to date: at midnight while the app is open, and when the user
 * comes back to it (Android pauses the timers of an app in the background).
 */
export function keepTodayUpToDate(): () => void {
  const schedule = () => {
    clearTimeout(midnight);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    midnight = setTimeout(() => {
      refreshToday();
      schedule();
    }, next.getTime() - now.getTime());
  };
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    refreshToday();
    schedule();
  };
  schedule();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearTimeout(midnight);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
