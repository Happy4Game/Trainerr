<script setup lang="ts">
import { IonButton, IonChip, IonInput, IonItem, IonLabel, IonList } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { COMMON_ADD_ONS_KG, MIN_FINE_STEP_KG, parseLoad } from '@/domain/loadSteps';
import type { MachineSetup } from '@/data/repositories/gymRepository';
import { useUnits } from '@/ui/useUnits';

const props = defineProps<{ setup: MachineSetup }>();
const emit = defineEmits<{ change: [setup: MachineSetup] }>();

const { t } = useI18n();
const { load: kg, symbol, fromInput } = useUnits();

/** Precisions offered for a load typed by hand: 0.5 kg is the finest. */
const FINE_STEPS = [MIN_FINE_STEP_KG, 1, 1.25, 2.5];

const addOns = computed(() => props.setup.addOnsKg ?? []);
const offered = computed(() => [...new Set([...COMMON_ADD_ONS_KG, ...addOns.value])].sort());
const fine = computed(() => props.setup.fineStepKg ?? MIN_FINE_STEP_KG);
const other = ref('');

function change(patch: Partial<MachineSetup>): void {
  emit('change', { ...props.setup, ...patch });
}
function toggleAddOn(value: number): void {
  const has = addOns.value.includes(value);
  change({ addOnsKg: has ? addOns.value.filter((a) => a !== value) : [...addOns.value, value] });
}
function addOther(): void {
  const typed = parseLoad(other.value);
  if (typed === undefined) return;
  change({ addOnsKg: [...addOns.value, fromInput(typed)] });
  other.value = '';
}
</script>

<template>
  <ion-list lines="none" class="setup">
    <ion-item>
      <ion-label class="ion-text-wrap">
        <h3>{{ t('exercise.setup.addOns') }}</h3>
        <p>{{ t('exercise.setup.addOnsHelp') }}</p>
      </ion-label>
    </ion-item>
    <div class="chips" data-testid="add-ons">
      <ion-chip
        v-for="value in offered"
        :key="value"
        :outline="!addOns.includes(value)"
        v-bind="addOns.includes(value) ? { color: 'primary' } : {}"
        role="switch"
        :aria-checked="addOns.includes(value)"
        @click="toggleAddOn(value)"
      >
        <ion-label>+ {{ kg(value) }}</ion-label>
      </ion-chip>
    </div>
    <ion-item>
      <ion-input
        v-model="other"
        :label="t('exercise.setup.otherAddOn', { unit: symbol })"
        label-placement="stacked"
        inputmode="decimal"
        enterkeyhint="done"
        @keyup.enter="addOther"
      />
      <ion-button slot="end" @click="addOther">{{ t('exercise.setup.addOther') }}</ion-button>
    </ion-item>

    <ion-item>
      <ion-label class="ion-text-wrap">
        <h3>{{ t('exercise.setup.fineStep') }}</h3>
        <p>{{ t('exercise.setup.fineStepHelp') }}</p>
      </ion-label>
    </ion-item>
    <div class="chips" role="radiogroup" :aria-label="t('exercise.setup.fineStep')">
      <ion-chip
        v-for="value in FINE_STEPS"
        :key="value"
        :outline="fine !== value"
        v-bind="fine === value ? { color: 'primary' } : {}"
        role="radio"
        :aria-checked="fine === value"
        @click="change({ fineStepKg: value })"
      >
        <ion-label>{{ kg(value) }}</ion-label>
      </ion-chip>
    </div>

    <div class="positions">
      <ion-input
        :model-value="setup.seat ?? ''"
        fill="outline"
        :label="t('exercise.setup.seat')"
        label-placement="stacked"
        :placeholder="t('exercise.setup.seatPlaceholder')"
        :debounce="400"
        @ion-input="change({ seat: String($event.detail.value ?? '') })"
      />
      <ion-input
        :model-value="setup.notch ?? ''"
        fill="outline"
        :label="t('exercise.setup.notch')"
        label-placement="stacked"
        :placeholder="t('exercise.setup.notchPlaceholder')"
        :debounce="400"
        @ion-input="change({ notch: String($event.detail.value ?? '') })"
      />
    </div>
  </ion-list>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  padding-inline: 12px;
}
.positions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px 16px;
}
h3 {
  font-size: 1rem;
}
</style>
