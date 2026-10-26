import { useI18n } from 'vue-i18n';

/** "2 reps en réserve", "4 reps ou plus en réserve": the RIR of a set in words. */
export function useRirText() {
  const { t } = useI18n();
  return (rir: number) =>
    rir >= 4 ? t('session.rir.plenty') : t('session.rir.value', { count: rir }, rir);
}
