<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { Check, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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

const byDay = computed(() => sessionsByDay(props.sessions));
/** Days shown: the whole month, or the week. */
const days = computed(() =>
  view.value === 'month'
    ? monthGrid(shown.value)
        .flat()
        .filter((d): d is IsoDate => !!d)
    : week.value,
);
const week = computed(() => weekDays(shown.value));

const format = (date: IsoDate, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
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
}
function backToToday(): void {
  shown.value = props.today;
}
function setView(next: 'month' | 'week'): void {
  view.value = next;
  // From a month to its week: the current one when it is this month, else its first.
  if (next === 'week' && startOfMonth(shown.value) !== startOfMonth(props.today))
    shown.value = startOfMonth(shown.value);
  else if (next === 'week') shown.value = props.today;
}
const isCurrent = computed(() =>
  view.value === 'month'
    ? startOfMonth(shown.value) === startOfMonth(props.today)
    : week.value.includes(props.today),
);
const dayLabel = (day: IsoDate) => format(day, { weekday: 'long', day: 'numeric', month: 'long' });
/** A month is a long list: today comes into view, not the 1st. */
const list = ref<HTMLElement>();
async function showToday(): Promise<void> {
  await nextTick();
  list.value?.querySelector('.is-today')?.scrollIntoView({ block: 'center' });
}
onMounted(showToday);
watch([view, shown], showToday);
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

    <!-- Same rows as "Your week" on Planning: one per day, the sessions done as cards. -->
    <ul ref="list" class="days" :aria-label="title">
      <template v-for="day in days" :key="day">
        <li v-for="s in byDay.get(day) ?? []" :key="s.id" class="done">
          <button
            type="button"
            class="row"
            :class="{ 'is-today': day === today }"
            :aria-label="
              t('calendar.openSession', { name: templateLabel(s.templateId), day: dayLabel(day) })
            "
            @click="emit('open', s.id)"
          >
            <span class="date" aria-hidden="true">
              <span class="weekday">{{ format(day, { weekday: 'short' }) }}</span>
              <span class="number">{{ Number(day.slice(8)) }}</span>
            </span>
            <span class="body">
              <strong class="name">{{ templateLabel(s.templateId) }}</strong>
              <span class="time">{{ t('calendar.sets', { count: setsOf(s) }, setsOf(s)) }}</span>
            </span>
            <span class="badge" aria-hidden="true">
              <Check :size="16" />{{ t('planning.done') }}
            </span>
          </button>
        </li>
        <li v-if="!byDay.has(day)" class="rest" :class="{ 'is-today': day === today }">
          <span class="date" aria-hidden="true">
            <span class="weekday">{{ format(day, { weekday: 'short' }) }}</span>
            <span class="number">{{ Number(day.slice(8)) }}</span>
          </span>
          <span class="visually-hidden">{{ dayLabel(day) }}</span>
          <span v-if="day <= today" class="rest-label">{{ t('calendar.rest') }}</span>
        </li>
      </template>
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
.days {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 16px;
  padding: 0;
  list-style: none;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid transparent;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
  color: var(--ion-text-color);
  font: inherit;
  text-align: start;
}
.row.is-today {
  border-color: var(--ion-color-primary);
}
.rest {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
}
.date {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  line-height: 1.05;
}
.rest .date {
  height: 40px;
  color: var(--ion-color-medium-shade);
}
.rest.is-today .date {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.done .date {
  background: rgba(var(--ion-color-success-rgb), 0.16);
  color: var(--ion-color-success-shade);
}
.weekday {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: capitalize;
}
.number {
  font-size: 1.15rem;
  font-weight: 800;
}
.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 1.05rem;
}
.time {
  color: var(--ion-color-medium-shade);
  font-size: 0.9rem;
}
.rest-label {
  color: var(--ion-color-medium-shade);
}
.badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--ion-color-success-rgb), 0.16);
  color: var(--ion-color-success-shade);
  font-size: 0.8rem;
  font-weight: 700;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
