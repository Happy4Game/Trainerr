<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
} from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openAppDatabase } from '@/data/appDatabase';
import {
  addMeasurement,
  deleteMeasurement,
  listMeasurements,
  type BodyMeasurement,
} from '@/data/repositories/bodyRepository';
import { parseLoad } from '@/domain/loadSteps';
import { proteinTargetGrams } from '@/domain/tracking';
import { todayIso } from '@/ui/useWeekPlan';
import { useUnits } from '@/ui/useUnits';

const { t, n, locale } = useI18n();
const { load, symbol, fromInput } = useUnits();
const measurements = ref<BodyMeasurement[]>([]);
const weight = ref('');
const arm = ref('');
const waist = ref('');

onMounted(async () => {
  const { db } = await openAppDatabase();
  measurements.value = await listMeasurements(db);
});

const lastWeight = computed(
  () => [...measurements.value].reverse().find((m) => m.weightKg !== undefined)?.weightKg,
);
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

async function save(): Promise<void> {
  const typed = parseLoad(weight.value);
  const weightKg = typed === undefined ? undefined : fromInput(typed);
  const values = { arm: parseLoad(arm.value), waist: parseLoad(waist.value) };
  const measured = Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, number] => entry[1] !== undefined),
  );
  if (weightKg === undefined && Object.keys(measured).length === 0) return;
  const { db } = await openAppDatabase();
  const saved = await addMeasurement(db, {
    date: todayIso(),
    ...(weightKg !== undefined ? { weightKg } : {}),
    measurements: measured,
  });
  measurements.value = [...measurements.value, saved];
  weight.value = arm.value = waist.value = '';
}

async function remove(id: string): Promise<void> {
  const { db } = await openAppDatabase();
  await deleteMeasurement(db, id);
  measurements.value = measurements.value.filter((m) => m.id !== id);
}
</script>

<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ t('body.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <div class="inputs">
        <ion-input
          v-model="weight"
          fill="outline"
          :label="t('body.weight', { unit: symbol })"
          label-placement="stacked"
          inputmode="decimal"
        />
        <ion-input
          v-model="arm"
          fill="outline"
          :label="t('body.arm')"
          label-placement="stacked"
          inputmode="decimal"
        />
        <ion-input
          v-model="waist"
          fill="outline"
          :label="t('body.waist')"
          label-placement="stacked"
          inputmode="decimal"
        />
      </div>
      <ion-button expand="block" @click="save">{{ t('body.save') }}</ion-button>
      <p class="small">{{ t('body.privacy') }}</p>
    </ion-card-content>
  </ion-card>

  <ion-card v-if="lastWeight !== undefined">
    <ion-card-header>
      <ion-card-title>{{ t('body.protein.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p>
        {{ t('body.protein.target', { grams: proteinTargetGrams(lastWeight) }) }}
      </p>
      <p class="small">{{ t('body.protein.source') }}</p>
    </ion-card-content>
  </ion-card>

  <ul class="list">
    <li v-for="m in [...measurements].reverse()" :key="m.id">
      <span>
        {{ shortDate(m.date) }} ·
        <template v-if="m.weightKg !== undefined">{{ load(m.weightKg) }}</template>
        <template v-for="(value, key) in m.measurements" :key="key">
          · {{ t(`body.${key}`) }} {{ t('body.cm', { value: n(value) }) }}
        </template>
      </span>
      <ion-button
        fill="clear"
        size="small"
        color="medium"
        :aria-label="t('body.delete')"
        @click="remove(m.id)"
      >
        ✕
      </ion-button>
    </li>
  </ul>
</template>

<style scoped>
.inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-block-end: 8px;
}
.small {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.list {
  padding-inline: 16px;
  list-style: none;
}
.list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
