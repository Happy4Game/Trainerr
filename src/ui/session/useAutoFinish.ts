import { onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { AUTO_FINISH_MINUTES } from '@/domain/autoFinish';
import { useTemplateName } from '@/ui/useTemplateName';
import { useCardio } from './useCardio';
import { cancelAutoFinish, scheduleAutoFinish } from './sessionNotification';
import { useSession } from './useSession';

/**
 * Closes the session by itself ten minutes after the last action, once the
 * last set of the last exercise is done (same as the "Finish" button).
 *
 * App on screen: a timer. App in the background: the web view is paused by
 * Android, so a notification is scheduled by the system for that time, and
 * the session is saved as done as soon as the app comes back or is opened
 * again (the time is kept on the phone). Mounted once, in App.vue.
 */
export function useAutoFinish(): void {
  const { t } = useI18n();
  const session = useSession();
  const cardio = useCardio();
  const templateLabel = useTemplateName();

  let timer: ReturnType<typeof setTimeout> | undefined;
  let closing = false;

  async function closeIfDue(): Promise<void> {
    const deadline = session.autoFinishDeadline.value;
    if (closing || deadline === undefined || Date.now() < deadline) return;
    closing = true;
    try {
      await cancelAutoFinish();
      const endedAt = session.lastActivityAt.value;
      await session.finish({ auto: true, ...(endedAt !== undefined ? { endedAt } : {}) });
    } finally {
      closing = false;
    }
  }

  function arm(deadline: number | undefined): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (deadline === undefined) return;
    // A little after the deadline, so that the check above is never early.
    timer = setTimeout(() => void closeIfDue(), Math.max(0, deadline - Date.now()) + 250);
  }

  watch(session.autoFinishDeadline, (deadline) => {
    arm(deadline);
    if (deadline === undefined) void cancelAutoFinish();
    void closeIfDue();
  });

  // Cardio logged on the "all done" screen is an action too.
  watch(
    () => {
      const id = session.active.value?.id;
      return id ? cardio.ofSession(id).length : 0;
    },
    (now, before) => {
      if (now !== before && session.active.value) session.touch();
    },
  );

  const onVisibility = () => {
    const deadline = session.autoFinishDeadline.value;
    const active = session.active.value;
    if (document.visibilityState === 'hidden') {
      if (deadline !== undefined && active) {
        void scheduleAutoFinish(deadline, {
          title: t('autoFinish.title'),
          body: t('autoFinish.body', {
            name: templateLabel(active.templateId),
            minutes: AUTO_FINISH_MINUTES,
          }),
          channelName: t('autoFinish.channel'),
        });
      }
      return;
    }
    // Back on screen: the timers were paused, the deadline may be over.
    void cancelAutoFinish();
    arm(deadline);
    void closeIfDue();
  };
  document.addEventListener('visibilitychange', onVisibility);
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    if (timer !== undefined) clearTimeout(timer);
  });
}
