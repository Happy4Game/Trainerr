<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonItem,
} from '@ionic/vue';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  handleDiscomfort,
  type DiscomfortResponse,
  type DiscomfortZone,
  type RedFlag,
} from '@/domain/advice';
import type { Exercise } from '@/domain/types';

const props = defineProps<{
  remaining: readonly Exercise[];
  /** Reports this week, per zone, before this one. */
  reportsThisWeek: Readonly<Record<string, number>>;
}>();
const emit = defineEmits<{
  apply: [response: DiscomfortResponse, zone: DiscomfortZone];
  close: [];
}>();

const { t } = useI18n();
const ZONES: DiscomfortZone[] = [
  'frontShoulder',
  'shoulder',
  'elbow',
  'wrist',
  'lowerBack',
  'knee',
  'hip',
  'other',
];
const FLAGS: RedFlag[] = [
  'sharpPain',
  'jointPain',
  'painAtRest',
  'tingling',
  'chestPainBreathless',
];

const zone = ref<DiscomfortZone>();
const flags = ref<RedFlag[]>([]);
const result = ref<DiscomfortResponse>();

function toggleFlag(flag: RedFlag, on: boolean): void {
  flags.value = on ? [...flags.value, flag] : flags.value.filter((f) => f !== flag);
}

function confirm(): void {
  if (!zone.value) return;
  result.value = handleDiscomfort({
    zone: zone.value,
    redFlags: flags.value,
    remaining: props.remaining,
    reportsThisWeek: (props.reportsThisWeek[zone.value] ?? 0) + 1,
  });
  emit('apply', result.value, zone.value);
}
</script>

<template>
  <ion-card class="discomfort">
    <ion-card-header>
      <ion-card-title>{{ t('discomfort.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <template v-if="!result">
        <p>{{ t('discomfort.where') }}</p>
        <div class="zones">
          <ion-button
            v-for="z in ZONES"
            :key="z"
            size="small"
            :fill="zone === z ? 'solid' : 'outline'"
            :aria-pressed="zone === z"
            @click="zone = z"
          >
            {{ t(`discomfort.zones.${z}`) }}
          </ion-button>
        </div>
        <p>{{ t('discomfort.signs') }}</p>
        <ion-item v-for="flag in FLAGS" :key="flag" lines="none">
          <ion-checkbox
            label-placement="end"
            justify="start"
            :checked="flags.includes(flag)"
            @ion-change="toggleFlag(flag, $event.detail.checked)"
          >
            {{ t(`discomfort.flags.${flag}`) }}
          </ion-checkbox>
        </ion-item>
        <ion-button expand="block" :disabled="!zone" @click="confirm">
          {{ t('discomfort.confirm') }}
        </ion-button>
        <ion-button expand="block" fill="clear" @click="emit('close')">
          {{ t('discomfort.cancel') }}
        </ion-button>
      </template>

      <template v-else>
        <div v-if="result.emergency" class="alert" role="alert">
          <strong>{{ t('discomfort.advice.callEmergency') }}</strong>
        </div>
        <div v-else-if="result.stopSession" class="alert" role="alert">
          <strong>{{ t('discomfort.advice.stopAndConsult') }}</strong>
        </div>
        <template v-else>
          <p v-for="code in result.advice" :key="code">{{ t(`discomfort.advice.${code}`) }}</p>
          <p v-if="result.removeExerciseIds.length > 0">
            {{ t('discomfort.removed', result.removeExerciseIds.length) }}
          </p>
        </template>
        <p class="small">{{ t('discomfort.notDiagnosis') }}</p>
        <ion-button expand="block" fill="outline" @click="emit('close')">
          {{ t('discomfort.ok') }}
        </ion-button>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.discomfort {
  margin-inline: 0;
  border: 2px solid var(--ion-color-warning);
}
.zones {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.alert {
  padding: 12px;
  border-radius: 8px;
  background: var(--ion-color-danger);
  color: var(--ion-color-danger-contrast);
}
.small {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
</style>
