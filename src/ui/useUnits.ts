import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { kgToUnit, unitToKg, type WeightUnit } from '@/domain/units';
import { useSettings } from '@/ui/useSettings';

/**
 * Every load shown or typed goes through here: stored in kg, shown in the
 * unit chosen in the settings, with the number format of the language.
 */
export function useUnits() {
  const { t, n } = useI18n();
  const { settings } = useSettings();
  const unit = computed<WeightUnit>(() => settings.value?.weightUnit ?? 'kg');

  /** Number in the user's unit (no symbol), e.g. for charts. */
  const toDisplay = (kg: number) => kgToUnit(kg, unit.value);
  /** "52 kg" or "114,5 lb". */
  const load = (kg: number) => t(`units.${unit.value}`, { value: n(toDisplay(kg)) });
  /** Value typed in the user's unit → kg. */
  const fromInput = (value: number) => unitToKg(value, unit.value);
  const symbol = computed(() => t(`units.symbol.${unit.value}`));

  return { unit, symbol, load, toDisplay, fromInput };
}
