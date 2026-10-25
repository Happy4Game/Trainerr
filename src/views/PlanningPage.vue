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
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { suggestProgramChange } from '@/domain/cycles';
import { useI18n } from 'vue-i18n';
import type { WeeklySlot } from '@/domain/planning';
import { TRAINING_MODELS, type TrainingModelId } from '@/domain/trainingModels';
import AvailabilityGrid from '@/ui/AvailabilityGrid.vue';
import { rescheduleNotifications } from '@/ui/notifications';
import { useSession } from '@/ui/session/useSession';
import { updateSettings } from '@/ui/useSettings';
import { todayIso, useWeekPlan } from '@/ui/useWeekPlan';

const { t, locale } = useI18n();
const templateLabel = useTemplateName();
const { settings, plan, days, frequencyNote } = useWeekPlan();
const session = useSession();

const editing = ref(false);
const freeSlots = ref<WeeklySlot[]>([]);
watch(
  () => settings.value?.freeSlots,
  (slots) => (freeSlots.value = [...(slots ?? [])]),
  { immediate: true },
);

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

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
        <h2 class="section">{{ t('planning.week') }}</h2>
        <ion-list>
          <ion-item v-for="day in days" :key="day.date" :class="{ today: day.date === todayIso() }">
            <ion-label>
              <h3>{{ dayLabel(day.date) }}</h3>
              <p v-if="day.session">
                {{ templateLabel(day.session.templateId) }} · {{ day.session.start }}–{{
                  day.session.end
                }}
              </p>
              <p v-else>{{ t('planning.rest') }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <p v-if="plan.unplaced > 0" class="warning" role="note">
          {{ t('planning.unplaced', plan.unplaced) }}
        </p>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ t('planning.availability') }}</ion-card-title>
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
            <ion-card-title>{{ t('planning.program') }}</ion-card-title>
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
.section {
  margin-block: 0 8px;
  font-size: 1.1rem;
}
.today {
  --background: var(--ion-color-light);
  font-weight: 600;
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
</style>
