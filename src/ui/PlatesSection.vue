<script setup lang="ts">
import {
  IonButton,
  IonItem,
  IonLabel,
  IonListHeader,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/vue';
import { Minus, Plus } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DEFAULT_PLATE_CONFIG, type PlateConfig } from '@/domain/plates';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';

const { t, n } = useI18n();
const { settings, updateSettings } = useSettings();
const { load: kg } = useUnits();

const BARS = [20, 15, 10];
/** Usual spring collars: 2.5 kg the pair. */
const COLLAR_KG = 1.25;
const MAX_PAIRS = 8;

const config = computed<PlateConfig>(() => settings.value?.barbell ?? DEFAULT_PLATE_CONFIG);

/** Collars removed when `collarKg` is given as undefined. */
async function save(patch: {
  barKg?: number;
  plates?: PlateConfig['plates'];
  collarKg?: number | undefined;
}): Promise<void> {
  const current = config.value;
  const collarKg = 'collarKg' in patch ? patch.collarKg : current.collarKg;
  await updateSettings({
    barbell: {
      barKg: patch.barKg ?? current.barKg,
      plates: patch.plates ?? current.plates,
      ...(collarKg ? { collarKg } : {}),
    },
  });
}

function setPairs(kgValue: number, pairs: number): Promise<void> {
  const clamped = Math.min(MAX_PAIRS, Math.max(0, pairs));
  return save({
    plates: config.value.plates.map((p) => (p.kg === kgValue ? { ...p, pairs: clamped } : p)),
  });
}
</script>

<template>
  <ion-list-header>{{ t('settings.plates.title') }}</ion-list-header>
  <ion-item>
    <ion-select
      :label="t('settings.plates.bar')"
      :value="config.barKg"
      interface="action-sheet"
      @ion-change="save({ barKg: Number($event.detail.value) })"
    >
      <ion-select-option v-for="bar in BARS" :key="bar" :value="bar">{{
        kg(bar)
      }}</ion-select-option>
    </ion-select>
  </ion-item>
  <ion-item v-for="plate in config.plates" :key="plate.kg" class="plate-row">
    <ion-label>{{ t('settings.plates.plate', { load: kg(plate.kg) }) }}</ion-label>
    <ion-button
      slot="end"
      fill="outline"
      :disabled="plate.pairs === 0"
      :aria-label="t('settings.plates.fewer', { load: kg(plate.kg) })"
      @click="setPairs(plate.kg, plate.pairs - 1)"
    >
      <Minus :size="20" aria-hidden="true" />
    </ion-button>
    <output
      slot="end"
      class="pairs"
      :aria-label="t('settings.plates.pairs', { count: plate.pairs }, plate.pairs)"
    >
      {{ n(plate.pairs) }}
    </output>
    <ion-button
      slot="end"
      fill="outline"
      :disabled="plate.pairs >= MAX_PAIRS"
      :aria-label="t('settings.plates.more', { load: kg(plate.kg) })"
      @click="setPairs(plate.kg, plate.pairs + 1)"
    >
      <Plus :size="20" aria-hidden="true" />
    </ion-button>
  </ion-item>
  <ion-item>
    <ion-toggle
      :checked="config.collarKg !== undefined"
      @ion-change="save({ collarKg: $event.detail.checked ? COLLAR_KG : undefined })"
    >
      <ion-label class="ion-text-wrap">
        {{ t('settings.plates.collars') }}
        <p>{{ t('settings.plates.collarsHelp', { load: kg(COLLAR_KG * 2) }) }}</p>
      </ion-label>
    </ion-toggle>
  </ion-item>
  <ion-item lines="none">
    <ion-label class="ion-text-wrap">
      <p>{{ t('settings.plates.help') }}</p>
    </ion-label>
  </ion-item>
</template>

<style scoped>
.pairs {
  min-width: 2.5ch;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.plate-row ion-button {
  min-width: 48px;
  min-height: 48px;
}
</style>
