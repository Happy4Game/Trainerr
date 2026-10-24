<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WeeklySlot } from '@/domain/planning';

const props = defineProps<{ modelValue: readonly WeeklySlot[]; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [slots: WeeklySlot[]] }>();

/** Time ranges offered in the grid; editable precisely later in Planning. */
interface Period {
  readonly id: 'morning' | 'noon' | 'evening' | 'late';
  readonly start: string;
  readonly end: string;
}
const PERIODS: readonly Period[] = [
  { id: 'morning', start: '08:00', end: '11:00' },
  { id: 'noon', start: '12:00', end: '14:00' },
  { id: 'evening', start: '18:00', end: '21:00' },
  { id: 'late', start: '21:00', end: '23:30' },
];

const { t, locale } = useI18n();
// 2026-10-19 is a Monday: weekday names come from the phone language.
const dayNames = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' });
  return [1, 2, 3, 4, 5, 6, 7].map((day) => format.format(Date.UTC(2026, 9, 18 + day)));
});

const isOn = (weekday: number, period: Period) =>
  props.modelValue.some(
    (s) => s.weekday === weekday && s.start === period.start && s.end === period.end,
  );

function toggle(weekday: number, period: Period): void {
  const others = props.modelValue.filter(
    (s) => !(s.weekday === weekday && s.start === period.start && s.end === period.end),
  );
  emit(
    'update:modelValue',
    isOn(weekday, period) ? others : [...others, { weekday, start: period.start, end: period.end }],
  );
}
</script>

<template>
  <div class="grid-wrapper">
    <table class="grid" :aria-label="label">
      <thead>
        <tr>
          <th scope="col">
            <span class="visually-hidden">{{ t('availability.day') }}</span>
          </th>
          <th v-for="period in PERIODS" :key="period.id" scope="col">
            {{ t(`availability.periods.${period.id}`) }}
            <small>{{ period.start }}–{{ period.end }}</small>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(day, index) in dayNames" :key="day">
          <th scope="row">{{ day }}</th>
          <td v-for="period in PERIODS" :key="period.id">
            <button
              type="button"
              :class="{ on: isOn(index + 1, period) }"
              :aria-pressed="isOn(index + 1, period)"
              :aria-label="`${day} ${t(`availability.periods.${period.id}`)}`"
              @click="toggle(index + 1, period)"
            >
              {{ isOn(index + 1, period) ? '✓' : '' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.grid-wrapper {
  overflow-x: auto;
}
.grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 4px;
}
th {
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}
th small {
  display: block;
  font-weight: 400;
  color: var(--ion-color-medium);
}
td button {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  background: transparent;
  color: var(--ion-text-color);
  font-size: 1.1rem;
}
td button.on {
  border-color: var(--ion-color-primary);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
