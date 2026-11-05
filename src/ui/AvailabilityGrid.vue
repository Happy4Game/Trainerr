<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { timeToMinutes } from '@/domain/dates';
import type { WeeklySlot } from '@/domain/planning';

const props = defineProps<{ modelValue: readonly WeeklySlot[]; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [slots: WeeklySlot[]] }>();

/** Time ranges offered in the grid; any other range is added precisely below it. */
interface Period {
  readonly id: 'early' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'late';
  readonly start: string;
  readonly end: string;
}
// The four first ones of earlier versions keep their hours: slots already saved still match.
const PERIODS: readonly Period[] = [
  { id: 'early', start: '06:00', end: '08:00' },
  { id: 'morning', start: '08:00', end: '11:00' },
  { id: 'noon', start: '12:00', end: '14:00' },
  { id: 'afternoon', start: '14:00', end: '18:00' },
  { id: 'evening', start: '18:00', end: '21:00' },
  { id: 'late', start: '21:00', end: '23:30' },
];
/** Shortest slot worth adding: a 30-minute express session. */
const MIN_MINUTES = 30;

const { t, locale } = useI18n();
// 2026-10-19 is a Monday: weekday names come from the phone language.
const dayName = (weekday: number, style: 'short' | 'long') =>
  new Intl.DateTimeFormat(locale.value, { weekday: style, timeZone: 'UTC' }).format(
    Date.UTC(2026, 9, 18 + weekday),
  );
const dayNames = computed(() => [1, 2, 3, 4, 5, 6, 7].map((day) => dayName(day, 'short')));

const same = (s: WeeklySlot, weekday: number, start: string, end: string) =>
  s.weekday === weekday && s.start === start && s.end === end;
const isOn = (weekday: number, period: Period) =>
  props.modelValue.some((s) => same(s, weekday, period.start, period.end));

function toggle(weekday: number, period: Period): void {
  const others = props.modelValue.filter((s) => !same(s, weekday, period.start, period.end));
  emit(
    'update:modelValue',
    isOn(weekday, period) ? others : [...others, { weekday, start: period.start, end: period.end }],
  );
}

/** A whole column at once: "every evening". */
const columnOn = (period: Period) => [1, 2, 3, 4, 5, 6, 7].every((day) => isOn(day, period));
function toggleColumn(period: Period): void {
  const others = props.modelValue.filter(
    (s) => !(s.start === period.start && s.end === period.end),
  );
  emit(
    'update:modelValue',
    columnOn(period)
      ? others
      : [
          ...others,
          ...[1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
            weekday,
            start: period.start,
            end: period.end,
          })),
        ],
  );
}

/** Slots that are not one of the grid's periods: added with exact hours. */
const custom = computed(() =>
  props.modelValue
    .filter((s) => !PERIODS.some((p) => same(s, s.weekday, p.start, p.end)))
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
);

const adding = ref(false);
/** 0 = Monday to Friday, 8 = every day, 1–7 = one day. */
const newDays = ref(1);
const newStart = ref('07:00');
const newEnd = ref('08:00');
const error = ref('');
const DAY_CHOICES = [0, 8, 1, 2, 3, 4, 5, 6, 7];
const daysOf = (choice: number) =>
  choice === 0 ? [1, 2, 3, 4, 5] : choice === 8 ? [1, 2, 3, 4, 5, 6, 7] : [choice];

function addCustom(): void {
  const start = newStart.value;
  const end = newEnd.value;
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    error.value = t('availability.custom.invalid');
    return;
  }
  if (timeToMinutes(end) - timeToMinutes(start) < MIN_MINUTES) {
    error.value = t('availability.custom.tooShort', { minutes: MIN_MINUTES });
    return;
  }
  error.value = '';
  const added = daysOf(newDays.value)
    .filter((weekday) => !props.modelValue.some((s) => same(s, weekday, start, end)))
    .map((weekday) => ({ weekday, start, end }));
  emit('update:modelValue', [...props.modelValue, ...added]);
  adding.value = false;
}

function removeCustom(slot: WeeklySlot): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((s) => !same(s, slot.weekday, slot.start, slot.end)),
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
            <button
              type="button"
              class="column"
              :aria-pressed="columnOn(period)"
              :aria-label="
                t('availability.everyDay', { period: t(`availability.periods.${period.id}`) })
              "
              @click="toggleColumn(period)"
            >
              {{ t(`availability.periods.${period.id}`) }}
              <small>{{ period.start }}<br />{{ period.end }}</small>
            </button>
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
  <p class="hint">{{ t('availability.columnHint') }}</p>

  <section class="custom" :aria-label="t('availability.custom.title')">
    <h3>{{ t('availability.custom.title') }}</h3>
    <ul v-if="custom.length > 0">
      <li v-for="slot in custom" :key="`${slot.weekday}-${slot.start}-${slot.end}`">
        <span>
          <strong>{{ dayName(slot.weekday, 'long') }}</strong> {{ slot.start }}–{{ slot.end }}
        </span>
        <button
          type="button"
          class="remove"
          :aria-label="
            t('availability.custom.remove', {
              day: dayName(slot.weekday, 'long'),
              start: slot.start,
              end: slot.end,
            })
          "
          @click="removeCustom(slot)"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <p v-else class="hint">{{ t('availability.custom.none') }}</p>

    <div v-if="adding" class="form">
      <label>
        {{ t('availability.custom.days') }}
        <select v-model.number="newDays">
          <option v-for="choice in DAY_CHOICES" :key="choice" :value="choice">
            {{
              choice === 0
                ? t('availability.custom.weekdays')
                : choice === 8
                  ? t('availability.custom.everyDay')
                  : dayName(choice, 'long')
            }}
          </option>
        </select>
      </label>
      <label>
        {{ t('availability.custom.from') }}
        <input v-model="newStart" type="time" step="900" />
      </label>
      <label>
        {{ t('availability.custom.to') }}
        <input v-model="newEnd" type="time" step="900" />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="adding = false">
          {{ t('common.cancel') }}
        </button>
        <button type="button" class="primary" @click="addCustom">
          {{ t('availability.custom.add') }}
        </button>
      </div>
    </div>
    <button v-else type="button" class="ghost add" @click="adding = true">
      + {{ t('availability.custom.open') }}
    </button>
  </section>
</template>

<style scoped>
.grid-wrapper {
  overflow-x: auto;
}
.grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 3px;
  table-layout: fixed;
}
.grid th:first-child {
  width: 40px;
}
th {
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
}
th small {
  display: block;
  font-weight: 400;
  font-size: 0.68rem;
  line-height: 1.2;
  color: var(--ion-color-medium);
}
.column {
  width: 100%;
  padding: 2px 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  line-height: 1.15;
  word-break: break-word;
}
.column[aria-pressed='true'] {
  color: var(--ion-color-primary);
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
.hint {
  margin: 4px 0 8px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}
.custom h3 {
  margin: 12px 0 4px;
  font-size: 1rem;
  font-weight: 700;
}
.custom ul {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}
.custom li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  border-bottom: 1px solid var(--ion-color-light);
}
.custom li strong::first-letter {
  text-transform: uppercase;
}
.remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--ion-color-medium);
}
.form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-block: 8px;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}
.form label:first-child {
  grid-column: 1 / -1;
}
.form select,
.form input {
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  font: inherit;
}
.error {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--ion-color-danger);
  font-size: 0.85rem;
}
.actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 8px;
}
.actions button,
.add {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
}
.ghost {
  border: 1px solid var(--ion-color-primary);
  background: transparent;
  color: var(--ion-color-primary);
}
.primary {
  border: 0;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.add {
  width: 100%;
  margin-block-end: 8px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
