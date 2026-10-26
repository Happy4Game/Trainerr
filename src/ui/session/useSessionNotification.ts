import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTemplateName } from '@/ui/useTemplateName';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';
import {
  cancelRestEnd,
  ensureSessionNotificationPermission,
  hideSessionNotification,
  scheduleRestEnd,
  showSessionNotification,
} from './sessionNotification';
import { useSession } from './useSession';

/**
 * Keeps the Android notification of the session up to date: what to do now,
 * the rest countdown, and an alert when the rest is over. Off in the settings
 * → nothing is shown.
 */
export function useSessionNotification(): void {
  const { t, locale } = useI18n();
  const session = useSession();
  const { settings } = useSettings();
  const templateLabel = useTemplateName();
  const { load: kg } = useUnits();

  const enabled = computed(() => settings.value?.sessionNotification !== false);
  const nameOf = (id: string) => {
    const e = session.entryOf(id)?.exercise;
    return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
  };
  const setLine = (id: string) => {
    const done = session.workSetsInSession(id).length;
    const total = session.plannedSets(id);
    const load = session.proposalFor(id)?.loadKg;
    return t('sessionNotification.set', {
      name: nameOf(id),
      current: Math.min(done + 1, total),
      total,
      load: load === undefined ? '' : kg(load),
    });
  };

  const content = computed(() => {
    const active = session.active.value;
    const step = session.step.value;
    if (!active || !step) return undefined;
    const title = t('sessionNotification.title', { name: templateLabel(active.templateId) });
    const restEndsAt = session.restEndsAt.value;
    if (step.kind === 'finished') return { title, body: t('sessionNotification.finished') };
    if (step.kind === 'askIfFree') {
      return { title, body: t('session.isFree', { name: nameOf(step.exerciseId) }) };
    }
    const body = setLine(step.exerciseId);
    return restEndsAt !== undefined && restEndsAt > Date.now()
      ? { title, body: t('sessionNotification.resting', { next: body }), restEndsAt }
      : { title, body };
  });

  watch(
    () => session.active.value?.id,
    async (id) => {
      if (id && enabled.value) await ensureSessionNotificationPermission();
    },
    { immediate: true },
  );

  watch(
    [content, enabled],
    async ([value, on]) => {
      if (!value || !on) {
        await hideSessionNotification();
        return;
      }
      await showSessionNotification({ ...value, channelName: t('sessionNotification.channel') });
    },
    { immediate: true },
  );

  // The end-of-rest alert follows the timer: −15 s, +30 s or skipped.
  watch(
    () => [session.restEndsAt.value, enabled.value] as const,
    async ([endsAt, on]) => {
      const step = session.step.value;
      if (endsAt === undefined || !on || endsAt <= Date.now() || step?.kind !== 'exercise') {
        await cancelRestEnd();
        return;
      }
      await scheduleRestEnd(endsAt, {
        title: t('sessionNotification.restOver'),
        body: setLine(step.exerciseId),
        channelName: t('sessionNotification.restChannel'),
      });
    },
  );
}
