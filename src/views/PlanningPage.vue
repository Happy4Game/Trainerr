<script setup lang="ts">
import { useTemplateName } from '@/ui/useTemplateName';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { CalendarClock, Check, Dumbbell } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { suggestProgramChange } from '@/domain/cycles';
import { useI18n } from 'vue-i18n';
import type { WeeklySlot } from '@/domain/planning';
import { TRAINING_MODELS, type TrainingModelId } from '@/domain/trainingModels';
import AvailabilityGrid from '@/ui/AvailabilityGrid.vue';
import NextSessionChooser from '@/ui/NextSessionChooser.vue';
import { rescheduleNotifications } from '@/ui/notifications';
import { useSession } from '@/ui/session/useSession';
import { updateSettings } from '@/ui/useSettings';
import { todayIso, useWeekPlan } from '@/ui/useWeekPlan';
import { weekOverview } from '@/domain/weekOverview';

const { t, locale } = useI18n();
const templateLabel = useTemplateName();
const { settings, plan, days, daysIfMissed, frequencyNote, nextWeekFirst } = useWeekPlan();
const session = useSession();
const router = useRouter();

const week = computed(() =>
  weekOverview({ days: days.value, done: session.history.value, today: todayIso() }),
);
const upcoming = computed(() => week.value.next ?? nextWeekFirst.value);
const target = computed(() => settings.value?.sessionsPerWeek ?? 0);

/** "And if I miss it?": the coming sessions of the week once the next one is missed. */
const showIfMissed = ref(false);
const ifMissed = computed(() => {
  const next = week.value.next;
  if (!next) return [];
  return daysIfMissed(next.date)
    .filter((d) => d.session)
    .map((d) => ({
      date: d.date,
      templateId: d.session?.templateId ?? '',
      before: week.value.days.find((w) => w.date === d.date)?.session?.templateId,
    }));
});

/** The last session of the week, pushed to next week when one is missed. */
const pushedOut = computed(() => {
  const coming = week.value.days.filter((d) => d.status === 'today' || d.status === 'planned');
  return ifMissed.value.length < coming.length ? coming.at(-1)?.session?.templateId : undefined;
});

const editing = ref(false);
const freeSlots = ref<WeeklySlot[]>([]);
watch(
  () => settings.value?.freeSlots,
  (slots) => (freeSlots.value = [...(slots ?? [])]),
  { immediate: true },
);

const formatDay = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
const dayLabel = (date: string) =>
  formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' });
const nextDay = (date: string) => (date === todayIso() ? t('planning.today') : dayLabel(date));

async function save(patch: Parameters<typeof updateSettings>[0]): Promise<void> {
  const saved = await updateSettings(patch);
  await rescheduleNotifications(saved);
  await session.reload();
}

async function saveAvailability(): Promise<void> {
  await save({ freeSlots: freeSlots.value });
  editing.value = false;
}

const MODELS = Object.keys(TRAINING_MODELS) as TrainingModelId[];
const changeSuggested = computed(() =>
  suggestProgramChange(
    settings.value?.programStart ?? session.history.value[0]?.date ?? todayIso(),
    todayIso(),
  ),
);
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.planning') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <template v-if="settings && plan">
        <section class="hero" :aria-label="t('planning.next')">
          <p v-if="!week.next" class="eyebrow">
            {{ week.doneCount >= target ? t('planning.weekDone') : t('planning.noneLeft') }}
          </p>
          <template v-if="upcoming">
            <span class="eyebrow next">{{ t('planning.next') }}</span>
            <h2>{{ templateLabel(upcoming.templateId) }}</h2>
            <p class="when">
              {{ nextDay(upcoming.date) }} · {{ upcoming.start }}–{{ upcoming.end }}
            </p>
            <p v-if="week.postponed" class="postponed" role="note">
              {{
                t('planning.postponed', {
                  day: formatDay(week.postponed.missedDate, { weekday: 'long' }),
                  template: templateLabel(week.postponed.templateId),
                })
              }}
            </p>
            <ion-button
              v-if="upcoming.date === todayIso()"
              expand="block"
              @click="router.push('/tabs/session')"
            >
              <Dumbbell :size="20" aria-hidden="true" class="icon" />
              {{ t('planning.start') }}
            </ion-button>
            <ion-button
              v-if="week.next"
              fill="clear"
              size="small"
              class="if-missed-toggle"
              :aria-expanded="showIfMissed"
              @click="showIfMissed = !showIfMissed"
            >
              {{ t('planning.ifMissed.ask') }}
            </ion-button>
          </template>
          <div
            v-if="showIfMissed && week.next"
            class="if-missed"
            role="region"
            :aria-label="t('planning.ifMissed.ask')"
          >
            <p>
              {{ t('planning.ifMissed.intro', { template: templateLabel(week.next.templateId) }) }}
            </p>
            <ul v-if="ifMissed.length > 0">
              <li v-for="d in ifMissed" :key="d.date">
                <span class="when-short">{{
                  formatDay(d.date, { weekday: 'long', day: 'numeric' })
                }}</span>
                <strong>{{ templateLabel(d.templateId) }}</strong>
                <span v-if="d.before && d.before !== d.templateId" class="instead">
                  {{ t('planning.ifMissed.instead', { template: templateLabel(d.before) }) }}
                </span>
              </li>
            </ul>
            <p v-if="ifMissed.length === 0">{{ t('planning.ifMissed.nextWeek') }}</p>
            <p v-else-if="pushedOut" class="pushed">
              {{ t('planning.ifMissed.pushed', { template: templateLabel(pushedOut) }) }}
            </p>
          </div>
          <div class="progress">
            <span
              v-for="i in Math.max(target, week.doneCount)"
              :key="i"
              class="segment"
              :class="{ filled: i <= week.doneCount }"
              aria-hidden="true"
            />
          </div>
          <p class="count">
            {{ t('planning.progress', { done: week.doneCount, count: target }, target) }}
          </p>
        </section>

        <h2 class="section">{{ t('planning.week') }}</h2>
        <ul class="week">
          <li
            v-for="day in week.days"
            :key="day.date"
            :class="[day.status, { 'is-today': day.date === todayIso() }]"
          >
            <span class="visually-hidden">{{ dayLabel(day.date) }}</span>
            <div class="date" aria-hidden="true">
              <span class="weekday">{{ formatDay(day.date, { weekday: 'short' }) }}</span>
              <span class="number">{{ formatDay(day.date, { day: 'numeric' }) }}</span>
            </div>
            <div v-if="day.status === 'rest'" class="body">
              <span class="rest">{{ t('planning.rest') }}</span>
            </div>
            <div v-else-if="day.status === 'missed' && day.slot" class="body">
              <strong class="name">{{ t('planning.missed') }}</strong>
              <span class="time">{{ t('planning.missedHelp') }}</span>
            </div>
            <div v-else class="body">
              <strong class="name">
                {{ templateLabel(day.doneTemplateId ?? day.session?.templateId ?? '') }}
              </strong>
              <span v-if="day.session" class="time">
                {{ day.session.start }}–{{ day.session.end }}
              </span>
            </div>
            <span v-if="day.status === 'done'" class="badge done">
              <Check :size="16" aria-hidden="true" />{{ t('planning.done') }}
            </span>
            <span v-else-if="day.status === 'today'" class="badge today">
              {{ t('planning.today') }}
            </span>
          </li>
        </ul>
        <p v-if="plan.unplaced > 0" class="warning" role="note">
          {{ t('planning.unplaced', plan.unplaced) }}
        </p>

        <NextSessionChooser :title="t('planning.order.title')" :help="t('planning.order.help')" />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <CalendarClock :size="22" aria-hidden="true" class="icon" />
              {{ t('planning.availability') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <template v-if="editing">
              <AvailabilityGrid v-model="freeSlots" :label="t('planning.availability')" />
              <ion-button
                expand="block"
                :disabled="freeSlots.length === 0"
                @click="saveAvailability"
              >
                {{ t('planning.save') }}
              </ion-button>
            </template>
            <ion-button v-else expand="block" fill="outline" @click="editing = true">
              {{ t('planning.edit') }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <Dumbbell :size="22" aria-hidden="true" class="icon" />
              {{ t('planning.program') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-select
                :label="t('planning.model')"
                :value="settings.model"
                interface="action-sheet"
                @ion-change="save({ model: $event.detail.value, programStart: todayIso() })"
              >
                <ion-select-option v-for="m in MODELS" :key="m" :value="m">
                  {{ t(`models.${m}`) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select
                :label="t('planning.sessionsPerWeek')"
                :value="settings.sessionsPerWeek"
                interface="action-sheet"
                @ion-change="save({ sessionsPerWeek: Number($event.detail.value) })"
              >
                <ion-select-option v-for="count in [2, 3, 4, 5, 6]" :key="count" :value="count">
                  {{ count }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <p v-if="frequencyNote" class="warning" role="note">
              {{ t('planning.frequencyNote') }}
            </p>
            <p>
              {{
                session.cycle.value.light
                  ? t('cycle.light', session.cycle.value)
                  : t('cycle.week', session.cycle.value)
              }}
            </p>
            <p v-if="changeSuggested" class="note" role="note">{{ t('cycle.change') }}</p>
          </ion-card-content>
        </ion-card>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.hero {
  margin-block-end: 20px;
  padding: 20px;
  border-radius: var(--app-radius);
  background: var(--ion-color-primary);
  box-shadow: var(--app-shadow);
  color: var(--ion-color-primary-contrast);
}
.eyebrow {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.85;
}
.eyebrow.next {
  margin: 0;
}
.hero h2 {
  margin: 2px 0 4px;
  font-size: 1.6rem;
  font-weight: 800;
}
.when {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.when::first-letter {
  text-transform: uppercase;
}
.hero ion-button {
  --background: var(--ion-color-primary-contrast);
  --color: var(--ion-color-primary);
  margin-block-start: 14px;
  font-weight: 700;
}
.progress {
  display: flex;
  gap: 6px;
  margin-block-start: 16px;
}
.segment {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 25%);
}
.segment.filled {
  background: var(--ion-color-primary-contrast);
}
.count {
  margin: 6px 0 0;
  font-size: 0.85rem;
  opacity: 0.9;
}
.section {
  margin-block: 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
}
/* The week as a timeline: sessions as cards, rest days quiet. */
.week {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}
.week li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1.5px solid transparent;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.week li.rest {
  padding-block: 4px;
  background: transparent;
  box-shadow: none;
}
.week li.today {
  border-color: var(--ion-color-primary);
}
.week li.missed {
  opacity: 0.55;
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
  background: var(--ion-color-light);
  line-height: 1.05;
}
.rest .date {
  height: 40px;
  background: transparent;
  color: var(--ion-color-medium-shade);
}
.is-today .date {
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
  font-variant-numeric: tabular-nums;
}
.rest .rest {
  color: var(--ion-color-medium-shade);
}
.badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}
.badge.done {
  background: rgba(var(--ion-color-success-rgb), 0.16);
  color: var(--ion-color-success-shade);
}
.badge.today {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
ion-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
}
.icon {
  flex: none;
  color: var(--ion-color-primary);
}
.hero .icon {
  margin-inline-end: 8px;
  color: inherit;
}
.postponed {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: var(--app-radius-small);
  background: rgb(255 255 255 / 16%);
  font-size: 0.9rem;
}
.hero .if-missed-toggle {
  --background: transparent;
  --color: var(--ion-color-primary-contrast);
  margin: 8px 0 0;
  text-decoration: underline;
}
.if-missed {
  margin-block-start: 8px;
  padding: 10px 12px;
  border-radius: var(--app-radius-small);
  background: rgb(255 255 255 / 12%);
  font-size: 0.9rem;
}
.if-missed p {
  margin: 0 0 6px;
}
.if-missed ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.if-missed li {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  padding-block: 3px;
}
.when-short::first-letter {
  text-transform: uppercase;
}
.pushed {
  margin: 6px 0 0 !important;
  opacity: 0.85;
}
.instead {
  opacity: 0.8;
}
.note {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-light);
}
.warning {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
