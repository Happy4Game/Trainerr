import { useI18n } from 'vue-i18n';
import { useUnits } from '@/ui/useUnits';
import { useSession } from './useSession';

/** "20 kg", or "help 40 kg" on an assisted machine, where the load logged is the help. */
export function useLoadLabel() {
  const { t } = useI18n();
  const { load: kg } = useUnits();
  const session = useSession();
  return (exerciseId: string, loadKg: number) =>
    session.entryOf(exerciseId)?.exercise.assisted
      ? t('session.assisted.load', { load: kg(loadKg) })
      : kg(loadKg);
}
