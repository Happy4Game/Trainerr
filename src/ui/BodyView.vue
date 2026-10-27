<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
} from '@ionic/vue';
import { Camera } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { weighingsToAdd } from '@/domain/healthWeights';
import { bodyWeightTrend } from '@/domain/insights';
import { parseLoad } from '@/domain/loadSteps';
import TrendChart from '@/ui/charts/TrendChart.vue';
import {
  HEALTH_CONNECT_STORE,
  healthConnectSupported,
  readHealthWeighings,
} from '@/ui/healthConnect';
import { lastPhotoOfPose, type PhotoPose } from '@/domain/photos';
import { proteinTargetGrams } from '@/domain/tracking';
import CameraCapture from '@/ui/body/CameraCapture.vue';
import { useBodyMeasurements } from '@/ui/body/useBodyMeasurements';
import { todayIso } from '@/ui/useWeekPlan';
import { useUnits } from '@/ui/useUnits';
import { useSession } from '@/ui/session/useSession';

const { t, n, locale } = useI18n();
const session = useSession();
const { load, symbol, fromInput, toDisplay } = useUnits();
const body = useBodyMeasurements();
const measurements = body.measurements;
const weight = ref('');
/** Today by default; an earlier day to log a weighing done elsewhere. */
const date = ref(todayIso());
const arm = ref('');
const waist = ref('');

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
  const day = date.value && date.value <= todayIso() ? date.value : todayIso();
  await body.add({
    date: day,
    ...(weightKg !== undefined ? { weightKg } : {}),
    measurements: measured,
  });
  weight.value = arm.value = waist.value = '';
  date.value = todayIso();
  // Assisted pull-ups and dips use the latest weight.
  if (weightKg !== undefined) await session.reloadWeighings();
}

const healthConnect = healthConnectSupported();
const importing = ref(false);
const healthMessage = ref('');
const needsHealthConnect = ref(false);

/** Weighings written by a scale or a health app, copied once into Trainerr. */
async function importFromHealthConnect(): Promise<void> {
  importing.value = true;
  healthMessage.value = '';
  needsHealthConnect.value = false;
  try {
    const result = await readHealthWeighings(addYears(todayIso(), -2));
    if (result.kind !== 'done') {
      healthMessage.value = t(`body.health.${result.kind}`);
      needsHealthConnect.value = result.kind !== 'denied';
      return;
    }
    const known = new Set(
      measurements.value.filter((m) => m.weightKg !== undefined).map((m) => m.date),
    );
    const toAdd = weighingsToAdd(result.weighings, known);
    for (const w of toAdd) {
      await body.add({ date: w.date, weightKg: w.weightKg, measurements: {} });
    }
    if (toAdd.length > 0) await session.reloadWeighings();
    healthMessage.value =
      toAdd.length > 0 ? t('body.health.done', toAdd.length) : t('body.health.nothing');
  } catch (error) {
    healthMessage.value = t('body.health.error', {
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    importing.value = false;
  }
}

const addYears = (date: string, years: number) =>
  `${Number(date.slice(0, 4)) + years}${date.slice(4, 10)}`.replace(/-02-29$/, '-02-28');

const photos = body.photos;
const comparison = computed(() =>
  photos.value.length >= 2 ? [photos.value[0], photos.value.at(-1)] : [],
);
/** Weighings and measurements; the photos are in the gallery. */
const entries = computed(() => [...measurements.value].reverse().filter((m) => !m.photo));

const camera = ref(false);
async function onPhoto(photo: string, pose: PhotoPose): Promise<void> {
  await body.add({ date: todayIso(), measurements: {}, photo, pose });
}

async function remove(id: string): Promise<void> {
  const removed = await body.remove(id);
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
      <template v-if="healthConnect">
        <ion-button
          expand="block"
          fill="outline"
          :disabled="importing"
          @click="importFromHealthConnect"
        >
          {{ importing ? t('body.health.reading') : t('body.health.import') }}
        </ion-button>
        <p v-if="healthMessage" class="small" role="status">
          {{ healthMessage }}
          <a
            v-if="needsHealthConnect"
            :href="HEALTH_CONNECT_STORE"
            target="_blank"
            rel="noopener"
            >{{ t('body.health.install') }}</a
          >
        </p>
        <p class="small">{{ t('body.health.help') }}</p>
      </template>
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
      <ion-button expand="block" @click="camera = true">
        <Camera :size="20" aria-hidden="true" class="icon" />
        {{ t('body.photo.take') }}
      </ion-button>
      <ion-button
        class="gallery-link"
        expand="block"
        fill="outline"
        router-link="/tabs/body/photos"
      >
        {{
          photos.length > 0 ? t('body.gallery.link', photos.length) : t('body.gallery.linkEmpty')
        }}
      </ion-button>
      <div v-if="comparison.length === 2" class="compare">
        <figure v-for="m in comparison" :key="m!.id">
          <img :src="m!.photo" :alt="t('body.photo.alt', { date: shortDate(m!.date) })" />
          <figcaption>{{ shortDate(m!.date) }}</figcaption>
        </figure>
      </div>
      <CameraCapture
        :open="camera"
        :last-of-pose="lastPhotoOfPose(photos)"
        @take="onPhoto"
        @close="camera = false"
      />
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
    <li v-for="m in entries" :key="m.id">
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
.icon {
  margin-inline-end: 8px;
}
.gallery-link {
  margin-block-start: 12px;
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
