import { useI18n } from 'vue-i18n';
import { useUnits } from '@/ui/useUnits';
import { useSession } from './useSession';

/**
 * "20 kg"; "help 40 kg" on an assisted machine, where the load logged is the
 * help; "body weight" (+ extra load) on a body weight exercise.
 */
export function useLoadLabel() {
  const { t } = useI18n();
  const { load: kg } = useUnits();
  const session = useSession();
  return (exerciseId: string, loadKg: number) => {
    const exercise = session.entryOf(exerciseId)?.exercise;
    if (exercise?.assisted) return t('session.assisted.load', { load: kg(loadKg) });
    if (exercise?.equipment === 'bodyweight') {
      return loadKg === 0
        ? t('session.bodyweight.none')
        : t('session.bodyweight.extra', { load: kg(loadKg) });
    }
    return kg(loadKg);
  };
}
