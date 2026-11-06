<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { addMonths, monthGrid, sessionsByDay, startOfMonth, weekDays } from '@/domain/calendar';
import { addDays } from '@/domain/dates';
import type { IsoDate, SessionLog } from '@/domain/types';
import { useTemplateName } from '@/ui/useTemplateName';

/**
 * Sessions done, on a calendar: a month (a dot on each day trained) or a week
 * (each day with its sessions). Arrows go back and forth; a day opens its sessions.
 */
const props = defineProps<{ sessions: readonly SessionLog[]; today: IsoDate }>();
const emit = defineEmits<{ open: [sessionId: string] }>();

const { t, locale } = useI18n();
const templateLabel = useTemplateName();

const view = ref<'month' | 'week'>('month');
/** Any day of the month or week shown. */
const shown = ref<IsoDate>(props.today);
/** Day tapped in the month: its sessions show under the grid. */
const picked = ref<IsoDate>(props.today);

const byDay = computed(() => sessionsByDay(props.sessions));
const weeks = computed(() => monthGrid(shown.value));
const week = computed(() => weekDays(shown.value));

const format = (date: IsoDate, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
const dayNames = computed(() =>
  weekDays('2026-11-02').map((d) => format(d, { weekday: 'narrow' })),
);

const title = computed(() =>
  view.value === 'month'
    ? format(shown.value, { month: 'long', year: 'numeric' })
    : t('calendar.weekOf', {
        from: format(week.value[0] ?? shown.value, { day: 'numeric', month: 'short' }),
        to: format(week.value[6] ?? shown.value, { day: 'numeric', month: 'short' }),
      }),
);
/** Sessions in the month or week shown. */
const count = computed(() => {
  const inView =
    view.value === 'month'
      ? (d: IsoDate) => d.slice(0, 7) === shown.value.slice(0, 7)
      : (d: IsoDate) => week.value.includes(d);
  return props.sessions.filter((s) => inView(s.date)).length;
});

function move(step: -1 | 1): void {
  shown.value =
    view.value === 'month' ? addMonths(shown.value, step) : addDays(shown.value, 7 * step);
  if (view.value === 'month') picked.value = shown.value;
}
function backToToday(): void {
  shown.value = props.today;
  picked.value = props.today;
}
function pick(day: IsoDate): void {
  picked.value = day;
  shown.value = day;
}
function setView(next: 'month' | 'week'): void {
  view.value = next;
  // The week of the day picked in the month: from "which day" to "which session".
  if (next === 'week') shown.value = picked.value;
  else picked.value = shown.value;
}
const isCurrent = computed(() =>
  view.value === 'month'
    ? startOfMonth(shown.value) === startOfMonth(props.today)
    : week.value.includes(props.today),
);
const dayLabel = (day: IsoDate) => format(day, { weekday: 'long', day: 'numeric', month: 'long' });
const setsOf = (s: SessionLog) => s.sets.filter((set) => !set.warmup).length;
</script>

<template>
  <div class="calendar">
    <div class="views" role="radiogroup" :aria-label="t('calendar.view')">
      <button
        v-for="v in ['month', 'week'] as const"
        :key="v"
        type="button"
        role="radio"
        :aria-checked="view === v"
        :class="{ on: view === v }"
        @click="setView(v)"
      >
        {{ t(`calendar.${v}`) }}
      </button>
    </div>

    <div class="nav">
      <button
        type="button"
        class="arrow"
        :aria-label="t(`calendar.previous.${view}`)"
        @click="move(-1)"
      >
        <ChevronLeft :size="26" aria-hidden="true" />
      </button>
      <div class="title">
        <h2 data-testid="calendar-title">{{ title }}</h2>
        <p>{{ count === 0 ? t('calendar.none') : t('calendar.count', { count }, count) }}</p>
      </div>
      <button type="button" class="arrow" :aria-label="t(`calendar.next.${view}`)" @click="move(1)">
        <ChevronRight :size="26" aria-hidden="true" />
      </button>
    </div>
    <ion-button v-if="!isCurrent" size="small" fill="clear" class="today" @click="backToToday">
      {{ t('calendar.today') }}
    </ion-button>

    <template v-if="view === 'month'">
      <table class="month" :aria-label="title">
        <thead>
          <tr>
            <th v-for="(name, i) in dayNames" :key="i" scope="col">{{ name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(days, w) in weeks" :key="w">
            <td v-for="(day, i) in days" :key="i">
              <button
                v-if="day"
                type="button"
                :class="{
                  trained: byDay.has(day),
                  picked: day === picked,
                  'is-today': day === today,
                }"
                :aria-pressed="day === picked"
                :aria-label="
                  byDay.has(day)
                    ? t(
                        'calendar.dayWith',
                        {
                          day: dayLabel(day),
                          count: byDay.get(day)!.length,
                        },
                        byDay.get(day)!.length,
                      )
                    : dayLabel(day)
                "
                @click="pick(day)"
              >
                <span class="number">{{ Number(day.slice(8)) }}</span>
                <span v-if="byDay.has(day)" class="dot" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <section class="day" :aria-label="dayLabel(picked)">
        <h3>{{ dayLabel(picked) }}</h3>
        <ul v-if="byDay.has(picked)" class="sessions">
          <li v-for="s in byDay.get(picked)" :key="s.id">
            <button type="button" class="session" @click="emit('open', s.id)">
              <strong>{{ templateLabel(s.templateId) }}</strong>
              <span>{{ t('calendar.sets', { count: setsOf(s) }, setsOf(s)) }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="none">{{ t('calendar.noSession') }}</p>
      </section>
    </template>

    <ul v-else class="week">
      <li v-for="day in week" :key="day" :class="{ 'is-today': day === today }">
        <span class="week-day">
          <strong>{{ format(day, { weekday: 'short' }) }}</strong>
          {{ format(day, { day: 'numeric', month: 'short' }) }}
        </span>
        <div class="week-sessions">
          <button
            v-for="s in byDay.get(day) ?? []"
            :key="s.id"
            type="button"
            class="session"
            @click="emit('open', s.id)"
          >
            <strong>{{ templateLabel(s.templateId) }}</strong>
            <span>{{ t('calendar.sets', { count: setsOf(s) }, setsOf(s)) }}</span>
          </button>
          <span v-if="!byDay.has(day) && day <= today" class="none">{{ t('calendar.rest') }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.views {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--tr-surface-2, var(--ion-color-light));
}
.views button {
  min-height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ion-text-color);
  font: inherit;
  font-weight: 700;
}
.views button.on {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block: 12px 0;
}
.arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: var(--tr-surface-2, var(--ion-color-light));
  color: var(--ion-color-primary);
}
.title {
  text-align: center;
}
.title h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}
.title h2::first-letter {
  text-transform: uppercase;
}
.title p {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.today {
  display: block;
  margin: 0 auto;
}
.month {
  width: 100%;
  margin-block: 8px;
  border-collapse: separate;
  border-spacing: 2px;
  table-layout: fixed;
}
.month th {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ion-color-medium);
  text-transform: uppercase;
}
.month td button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--ion-text-color);
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.month td button.trained {
  background: rgb(var(--ion-color-primary-rgb) / 18%);
  font-weight: 800;
}
.month td button.is-today {
  border-color: var(--ion-color-medium);
}
.month td button.picked {
  border-color: var(--ion-color-primary);
}
.dot {
  width: 6px;
  height: 6px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--ion-color-primary);
}
.day h3 {
  margin: 8px 0 4px;
  font-size: 1rem;
  font-weight: 700;
}
.day h3::first-letter {
  text-transform: uppercase;
}
.sessions,
.week {
  margin: 0;
  padding: 0;
  list-style: none;
}
.session {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  margin-block: 4px;
  padding: 8px 12px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 12px;
  background: transparent;
  color: var(--ion-text-color);
  font: inherit;
  text-align: start;
}
.session span {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
  white-space: nowrap;
}
.none {
  color: var(--ion-color-medium);
}
.week li {
  display: grid;
  grid-template-columns: 5.5em 1fr;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  border-bottom: 1px solid var(--ion-color-light);
}
.week li.is-today .week-day {
  color: var(--ion-color-primary);
}
.week-day {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}
.week-day strong::first-letter {
  text-transform: uppercase;
}
</style>
