<script setup lang="ts">
import { IonInput, IonItem, IonLabel, IonToggle } from '@ionic/vue';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { sourceById } from '@/data/content/sources';
import { DEFAULT_REP_RANGES, OWN_REP_RANGE, validRepRange } from '@/domain/progression';
import { useSettings } from '@/ui/useSettings';

/**
 * The rep range: the app's, fitted to each kind of exercise, or the user's
 * own for every exercise (8–12 by default when turned on).
 */
const { t } = useI18n();
const { settings, updateSettings } = useSettings();
const SOURCES = ['schoenfeld2017load', 'schoenfeld2021'].map((id) => sourceById(id));
const DEFAULT_OWN = { min: 8, max: 12 } as const;

const min = ref('');
const max = ref('');
const invalid = ref(false);
watch(
  () => settings.value?.repRange,
  (range) => {
    min.value = String(range?.min ?? DEFAULT_OWN.min);
    max.value = String(range?.max ?? DEFAULT_OWN.max);
  },
  { immediate: true },
);

async function setOwn(on: boolean): Promise<void> {
  invalid.value = false;
  await updateSettings({ repRange: on ? { ...DEFAULT_OWN } : undefined });
}
async function save(): Promise<void> {
  const range = { min: Number(min.value), max: Number(max.value) };
  invalid.value = !validRepRange(range);
  if (!invalid.value) await updateSettings({ repRange: range });
}
</script>

<template>
  <ion-item v-if="settings">
    <ion-toggle
      :checked="settings.repRange !== undefined"
      @ion-change="setOwn($event.detail.checked)"
    >
      <ion-label class="ion-text-wrap">
        {{ t('settings.repRange.own') }}
        <p>
          {{
            t('settings.repRange.auto', {
              heavy: `${DEFAULT_REP_RANGES.heavyCompound.min}–${DEFAULT_REP_RANGES.heavyCompound.max}`,
              machine: `${DEFAULT_REP_RANGES.machineCompound.min}–${DEFAULT_REP_RANGES.machineCompound.max}`,
              isolation: `${DEFAULT_REP_RANGES.isolation.min}–${DEFAULT_REP_RANGES.isolation.max}`,
            })
          }}
        </p>
      </ion-label>
    </ion-toggle>
  </ion-item>
  <ion-item v-if="settings?.repRange" lines="none">
    <div class="range" role="group" :aria-label="t('settings.repRange.own')">
      <ion-input
        v-model="min"
        type="number"
        inputmode="numeric"
        :min="OWN_REP_RANGE.lowest"
        :max="OWN_REP_RANGE.highest"
        fill="outline"
        label-placement="stacked"
        :label="t('settings.repRange.min')"
        @ion-change="save"
      />
      <ion-input
        v-model="max"
        type="number"
        inputmode="numeric"
        :min="OWN_REP_RANGE.lowest"
        :max="OWN_REP_RANGE.highest"
        fill="outline"
        label-placement="stacked"
        :label="t('settings.repRange.max')"
        @ion-change="save"
      />
    </div>
  </ion-item>
  <ion-item v-if="settings?.repRange" lines="full">
    <ion-label class="ion-text-wrap">
      <p v-if="invalid" class="invalid" role="alert">
        {{ t('settings.repRange.invalid', OWN_REP_RANGE) }}
      </p>
      <p>{{ t('settings.repRange.why') }}</p>
      <p>
        <template v-for="(source, i) in SOURCES" :key="source?.id">
          <a v-if="source" :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
          <br v-if="i < SOURCES.length - 1" />
        </template>
      </p>
    </ion-label>
  </ion-item>
</template>

<style scoped>
.range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  padding-block: 4px;
}
.invalid {
  color: var(--ion-color-danger) !important;
}
</style>
