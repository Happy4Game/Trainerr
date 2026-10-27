<script setup lang="ts">
import { IonButton, IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openAppDatabase } from '@/data/appDatabase';
import { importSessions } from '@/data/repositories/sessionRepository';
import { addBadges } from '@/data/repositories/badgeRepository';
import { earnedBadges } from '@/domain/achievements';
import {
  detectFormat,
  parseCsv,
  parseLoadsCsv,
  parseWorkoutCsv,
  suggestMatches,
  type ImportedLoad,
  type ImportedSession,
} from '@/domain/importCsv';
import NextSessionChooser from '@/ui/NextSessionChooser.vue';
import { useSession } from '@/ui/session/useSession';
import { useCatalog } from '@/ui/useCatalog';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';

const { t, locale } = useI18n();
const { entries } = useCatalog();
const { settings } = useSettings();
const session = useSession();
const { load: kg } = useUnits();

const fileInput = ref<HTMLInputElement>();
const text = ref('');
const format = ref<string>();
const strongUnit = ref<'kg' | 'lb'>('kg');
const parsed = ref<ImportedSession[]>([]);
/** A file of loads already lifted, one per machine, instead of sessions. */
const loads = ref<ImportedLoad[]>([]);
/** Sessions just imported: the user says where the cycle goes on. */
const imported = ref(false);
/** Exercise name in the file → catalog id, or '' to skip it. */
const matches = ref<Record<string, string>>({});
const message = ref('');

const catalogNames = computed(() =>
  entries.value.map((e) => ({
    id: e.exercise.id,
    names: [e.exercise.nameEn, e.exercise.name, ...e.exercise.aliases],
  })),
);
const nameOf = (id: string) => {
  const e = entries.value.find((x) => x.exercise.id === id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const names = computed(() => [
  ...new Set([
    ...parsed.value.flatMap((s) => s.sets.map((set) => set.exerciseName)),
    ...loads.value.map((l) => l.exerciseName),
  ]),
]);
const suggestions = computed(() =>
  Object.fromEntries(names.value.map((n) => [n, suggestMatches(n, catalogNames.value, 6)])),
);

function parse(): void {
  imported.value = false;
  try {
    const header = parseCsv(text.value)[0] ?? [];
    if (detectFormat(header) === 'loads') {
      format.value = 'loads';
      parsed.value = [];
      loads.value = parseLoadsCsv(text.value);
    } else {
      const result = parseWorkoutCsv(text.value, { strongUnit: strongUnit.value });
      format.value = result.format;
      parsed.value = result.sessions;
      loads.value = [];
    }
    matches.value = Object.fromEntries(
      names.value.map((n) => [n, suggestions.value[n]?.[0] ?? '']),
    );
    message.value = '';
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
    parsed.value = [];
    loads.value = [];
  }
}

async function onFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  text.value = await file.text();
  parse();
}

function setUnit(value: unknown): void {
  strongUnit.value = value === 'lb' ? 'lb' : 'kg';
  parse();
}

async function confirm(): Promise<void> {
  const { db } = await openAppDatabase();
  const sessions = parsed.value.map((s) => ({
    date: s.date,
    title: s.title,
    sets: s.sets.flatMap((set) => {
      const exerciseId = matches.value[set.exerciseName];
      return exerciseId
        ? [{ exerciseId, loadKg: set.loadKg, reps: set.reps, warmup: set.warmup }]
        : [];
    }),
  }));
  const count = await importSessions(db, settings.value?.currentGymId ?? 'default', sessions);
  await session.reload();
  // Badges already earned in the imported past: given now, quietly, so the
  // next summary does not hail a "first session" after fifty of them.
  const today = new Date().toISOString().slice(0, 10);
  await addBadges(
    db,
    earnedBadges({
      sessions: session.history.value,
      sessionsPerWeek: settings.value?.sessionsPerWeek ?? 3,
      today,
      recordsBeaten: 0,
      backToLevelReached: false,
    }),
    today,
  );
  parsed.value = [];
  message.value = t('importCsv.done', count);
  imported.value = count > 0;
}

async function confirmLoads(): Promise<void> {
  let count = 0;
  for (const load of loads.value) {
    const exerciseId = matches.value[load.exerciseName];
    if (!exerciseId) continue;
    await session.saveReference(exerciseId, load.loadKg, load.reps, load.date);
    count++;
  }
  loads.value = [];
  message.value = t('importCsv.loadsDone', count);
}
</script>

<template>
  <div class="import">
    <ion-button expand="block" fill="outline" @click="fileInput?.click()">
      {{ t('importCsv.choose') }}
    </ion-button>
    <input
      ref="fileInput"
      type="file"
      accept=".csv,text/csv"
      hidden
      :aria-label="t('importCsv.choose')"
      @change="onFile"
    />
    <p v-if="message" role="status">{{ message }}</p>
    <NextSessionChooser
      v-if="imported"
      :title="t('importCsv.continueTitle')"
      :help="t('importCsv.continueHelp')"
    />

    <template v-if="loads.length > 0">
      <p>{{ t('importCsv.loadsFound', loads.length) }}</p>
      <p>{{ t('importCsv.check') }}</p>
      <div v-for="load in loads" :key="load.exerciseName" class="match">
        <label :for="`match-${load.exerciseName}`">
          {{ load.exerciseName }} · {{ kg(load.loadKg) }} × {{ load.reps }}
        </label>
        <select :id="`match-${load.exerciseName}`" v-model="matches[load.exerciseName]">
          <option v-for="id in suggestions[load.exerciseName]" :key="id" :value="id">
            {{ nameOf(id) }}
          </option>
          <option value="">{{ t('importCsv.skip') }}</option>
        </select>
      </div>
      <ion-button expand="block" @click="confirmLoads">
        {{ t('importCsv.loadsConfirm', loads.length) }}
      </ion-button>
    </template>

    <template v-if="parsed.length > 0">
      <p>
        {{ t('importCsv.found', { app: t(`importCsv.apps.${format}`), sessions: parsed.length }) }}
      </p>
      <template v-if="format === 'strong'">
        <p>{{ t('importCsv.unit') }}</p>
        <ion-segment :value="strongUnit" @ion-change="setUnit($event.detail.value)">
          <ion-segment-button value="kg"><ion-label>kg</ion-label></ion-segment-button>
          <ion-segment-button value="lb"><ion-label>lb</ion-label></ion-segment-button>
        </ion-segment>
      </template>
      <p>{{ t('importCsv.check') }}</p>
      <div v-for="name in names" :key="name" class="match">
        <label :for="`match-${name}`">{{ name }}</label>
        <select :id="`match-${name}`" v-model="matches[name]">
          <option v-for="id in suggestions[name]" :key="id" :value="id">{{ nameOf(id) }}</option>
          <option value="">{{ t('importCsv.skip') }}</option>
        </select>
      </div>
      <ion-button expand="block" @click="confirm">
        {{ t('importCsv.confirm', parsed.length) }}
      </ion-button>
    </template>
  </div>
</template>

<style scoped>
.import {
  padding-block: 8px;
}
.match {
  display: grid;
  gap: 4px;
  margin-block: 8px;
}
select {
  min-height: 44px;
  padding-inline: 8px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  background: var(--ion-background-color, #fff);
  color: var(--ion-text-color, #000);
  font-size: 1rem;
}
</style>
