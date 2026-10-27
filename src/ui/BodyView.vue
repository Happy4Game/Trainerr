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
import { bodyWeightTrend } from '@/domain/insights';
import { parseLoad } from '@/domain/loadSteps';
import TrendChart from '@/ui/charts/TrendChart.vue';
import { proteinTargetGrams } from '@/domain/tracking';
import { readPhoto } from '@/ui/photo';
import { todayIso } from '@/ui/useWeekPlan';
import { useUnits } from '@/ui/useUnits';
import { useSession } from '@/ui/session/useSession';

const { t, n, locale } = useI18n();
const session = useSession();
const { load, symbol, fromInput, toDisplay } = useUnits();
const measurements = ref<BodyMeasurement[]>([]);
const weight = ref('');
/** Today by default; an earlier day to log a weighing done elsewhere. */
const date = ref(todayIso());
const arm = ref('');
const waist = ref('');

onMounted(async () => {
  const { db } = await openAppDatabase();
  measurements.value = await listMeasurements(db);
});

const lastWeight = computed(
  () => [...measurements.value].reverse().find((m) => m.weightKg !== undefined)?.weightKg,
);
const trend = computed(() => bodyWeightTrend(measurements.value, todayIso()));
/** "+0,3 kg", "−0,5 kg", "0 kg". */
const signed = (kg: number) => (kg > 0 ? `+${load(kg)}` : kg < 0 ? `−${load(-kg)}` : load(0));
const dayMonth = (day: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
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
  const day = date.value && date.value <= todayIso() ? date.value : todayIso();
  const saved = await addMeasurement(db, {
    date: day,
    ...(weightKg !== undefined ? { weightKg } : {}),
    measurements: measured,
  });
  measurements.value = [...measurements.value, saved].sort((a, b) => a.date.localeCompare(b.date));
  weight.value = arm.value = waist.value = '';
  date.value = todayIso();
  // Assisted pull-ups and dips use the latest weight.
  if (weightKg !== undefined) await session.reloadWeighings();
}

const photos = computed(() => measurements.value.filter((m) => m.photo));
const comparison = computed(() =>
  photos.value.length >= 2 ? [photos.value[0], photos.value.at(-1)] : [],
);

async function onPhoto(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const { db } = await openAppDatabase();
  const saved = await addMeasurement(db, {
    date: todayIso(),
    measurements: {},
    photo: await readPhoto(file),
  });
  measurements.value = [...measurements.value, saved];
}

async function remove(id: string): Promise<void> {
  const { db } = await openAppDatabase();
  const removed = measurements.value.find((m) => m.id === id);
  await deleteMeasurement(db, id);
  measurements.value = measurements.value.filter((m) => m.id !== id);
  if (removed?.weightKg !== undefined) await session.reloadWeighings();
}
</script>

<template>
  <ion-card v-if="trend">
    <ion-card-header>
      <ion-card-title>{{ t('stats.body.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <div class="headline">
        <div>
          <span class="big tr-number">{{ load(trend.latestKg) }}</span>
          <span class="small">{{ t('stats.body.latest') }}</span>
        </div>
        <span v-if="trend.perWeekKg !== undefined" class="badge">
          {{ t('stats.body.perWeek', { change: signed(trend.perWeekKg) }) }}
        </span>
      </div>
      <TrendChart
        v-if="trend.points.length > 1"
        :points="
          trend.points.map((p) => ({ label: dayMonth(p.date), value: toDisplay(p.weightKg) }))
        "
        :format="(v) => n(Math.round(v * 10) / 10)"
        :legend="t('stats.body.legend', { unit: symbol })"
        :description="t('stats.body.description', { count: trend.points.length })"
      />
      <p class="small">
        {{ trend.perWeekKg === undefined ? t('stats.body.needMore') : t('stats.body.help') }}
      </p>
    </ion-card-content>
  </ion-card>

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
      <ion-input
        v-model="date"
        class="date"
        type="date"
        fill="outline"
        :max="todayIso()"
        :label="t('body.date')"
        label-placement="stacked"
      />
      <ion-button expand="block" @click="save">{{ t('body.save') }}</ion-button>
      <p class="small">{{ t('body.importHint') }}</p>
      <p class="small">{{ t('body.privacy') }}</p>
    </ion-card-content>
  </ion-card>

  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ t('body.photo.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p class="small">{{ t('body.photo.help') }}</p>
      <label class="photo-button">
        {{ t('body.photo.take') }}
        <input type="file" accept="image/*" capture="user" @change="onPhoto" />
      </label>
      <div v-if="comparison.length === 2" class="compare">
        <figure v-for="m in comparison" :key="m!.id">
          <img :src="m!.photo" :alt="t('body.photo.alt', { date: shortDate(m!.date) })" />
          <figcaption>{{ shortDate(m!.date) }}</figcaption>
        </figure>
      </div>
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
.headline {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.headline > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.big {
  font-size: var(--tr-font-xxl);
  color: var(--tr-text);
}
.badge {
  padding: 6px 12px;
  border-radius: var(--tr-radius-pill);
  font-size: var(--tr-font-xs);
  font-weight: 800;
  white-space: nowrap;
  background: var(--tr-surface-2);
  color: var(--tr-text);
}
.date {
  margin-block-end: 8px;
}
.photo-button {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding-inline: 12px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 8px;
  color: var(--ion-color-primary);
}
.photo-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-block-start: 12px;
}
.compare img {
  width: 100%;
  border-radius: 8px;
}
.compare figure {
  margin: 0;
  text-align: center;
}
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
