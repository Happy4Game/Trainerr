<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  CARDIO_EFFORTS,
  CARDIO_MACHINES,
  cardioMachine,
  invalidCardioFields,
  type CardioEffort,
  type CardioEntry,
  type CardioField,
  type CardioId,
  type CardioPosition,
} from '@/domain/cardio';
import CardioIcon from './CardioIcon.vue';
import { useCardioText } from './useCardioText';
import { useCardio } from '@/ui/session/useCardio';

/**
 * What the cardio machine shows at the end, typed in: the time first, then
 * only the values this machine has (no cadence on a treadmill).
 */
const props = defineProps<{
  open: boolean;
  /** An entry to correct, or the planned machine and minutes to start from. */
  initial?: Partial<CardioEntry> | undefined;
  position?: CardioPosition | undefined;
  /** Correcting an entry: it can be deleted. */
  removable?: boolean;
}>();
const emit = defineEmits<{ save: [entry: CardioEntry]; remove: []; close: [] }>();

const { t } = useI18n();
const text = useCardioText();
const cardio = useCardio();

/** Entry field → value of the entry it fills. */
const KEYS: Readonly<Record<CardioField, keyof CardioEntry>> = {
  distance: 'distanceKm',
  speed: 'speedKmh',
  incline: 'inclinePct',
  level: 'level',
  cadence: 'cadence',
  heartRate: 'avgHr',
  calories: 'calories',
};
const INTEGER: readonly CardioField[] = ['heartRate', 'calories'];

const cardioId = ref<CardioId>('treadmill');
const minutes = ref('');
const values = ref<Partial<Record<CardioField, string>>>({});
const effort = ref<CardioEffort>();
const invalid = ref<string[]>([]);
const confirmRemove = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const start = props.initial ?? {};
    cardioId.value = start.cardioId ?? 'treadmill';
    minutes.value = start.minutes !== undefined ? String(start.minutes) : '';
    values.value = Object.fromEntries(
      Object.entries(KEYS)
        .filter(([, key]) => start[key] !== undefined)
        .map(([field, key]) => [field, String(start[key])]),
    );
    effort.value = start.effort;
    invalid.value = [];
    confirmRemove.value = false;
  },
  { immediate: true },
);

const machine = computed(() => cardioMachine(cardioId.value));
const last = computed(() => cardio.lastOn(cardioId.value));
const parse = (value: string | undefined) => {
  const trimmed = (value ?? '').trim().replace(',', '.');
  return trimmed === '' ? undefined : Number(trimmed);
};

function save(): void {
  const entry: Record<string, unknown> = {
    cardioId: cardioId.value,
    minutes: parse(minutes.value),
    ...(effort.value ? { effort: effort.value } : {}),
    ...(props.position ? { position: props.position } : {}),
  };
  for (const field of machine.value?.fields ?? []) {
    const value = parse(values.value[field]);
    if (value !== undefined)
      entry[KEYS[field]] = INTEGER.includes(field) ? Math.round(value) : value;
  }
  const result = entry as unknown as CardioEntry;
  invalid.value = invalidCardioFields(result);
  if (invalid.value.length > 0) return;
  emit('save', result);
}

/** Bounds keys of the domain → labels of the fields. */
const FIELD_OF: Readonly<Record<string, string>> = {
  minutes: 'minutes',
  ...Object.fromEntries(Object.entries(KEYS).map(([field, key]) => [key, field])),
};
const invalidText = computed(() =>
  invalid.value.map((key) => t(`cardio.fields.${FIELD_OF[key] ?? key}`)).join(', '),
);
</script>

<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('cardio.entry.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="label">{{ t('cardio.entry.machine') }}</p>
      <div class="machines" role="radiogroup" :aria-label="t('cardio.entry.machine')">
        <button
          v-for="m in CARDIO_MACHINES"
          :key="m.id"
          type="button"
          role="radio"
          class="machine"
          :class="{ chosen: m.id === cardioId }"
          :aria-checked="m.id === cardioId"
          @click="cardioId = m.id"
        >
          <CardioIcon :icon="m.icon" :size="18" />
          {{ text.name(m.id) }}
        </button>
      </div>
      <p v-if="last" class="hint">
        {{ t('cardio.entry.lastTime', { detail: text.detail(last) }) }}
      </p>

      <ion-input
        v-model="minutes"
        class="field"
        type="text"
        inputmode="decimal"
        fill="outline"
        label-placement="stacked"
        :label="t('cardio.fields.minutes')"
      />
      <ion-input
        v-for="field in machine?.fields ?? []"
        :key="field"
        v-model="values[field]"
        class="field"
        type="text"
        :inputmode="INTEGER.includes(field) ? 'numeric' : 'decimal'"
        fill="outline"
        label-placement="stacked"
        :label="t(`cardio.fields.${field}`)"
      />

      <p class="label">{{ t('cardio.effort.title') }}</p>
      <div class="efforts" role="radiogroup" :aria-label="t('cardio.effort.title')">
        <button
          v-for="e in CARDIO_EFFORTS"
          :key="e"
          type="button"
          role="radio"
          class="effort"
          :class="{ chosen: effort === e }"
          :aria-checked="effort === e"
          @click="effort = effort === e ? undefined : e"
        >
          <strong>{{ t(`cardio.effort.${e}`) }}</strong>
          <span>{{ t(`cardio.effort.${e}Help`) }}</span>
        </button>
      </div>

      <p v-if="invalid.length > 0" class="invalid" role="alert">
        {{ t('cardio.entry.invalid', { fields: invalidText }) }}
      </p>
      <ion-button expand="block" @click="save">{{ t('cardio.entry.save') }}</ion-button>
      <template v-if="removable">
        <ion-button
          v-if="!confirmRemove"
          expand="block"
          fill="clear"
          color="danger"
          @click="confirmRemove = true"
        >
          {{ t('cardio.entry.delete') }}
        </ion-button>
        <ion-button v-else expand="block" color="danger" @click="emit('remove')">
          {{ t('cardio.entry.deleteConfirm') }}
        </ion-button>
      </template>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.label {
  margin-block: 12px 6px;
  font-weight: 700;
}
.machines,
.efforts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.machine,
.effort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid var(--ion-color-primary);
  border-radius: var(--tr-radius-pill);
  background: none;
  color: var(--ion-color-primary);
  font: inherit;
  font-size: 0.9rem;
}
.effort {
  flex: 1 1 100%;
  flex-direction: column;
  align-items: flex-start;
  border-radius: var(--tr-radius-m);
  text-align: start;
}
.effort span {
  color: var(--tr-text-muted);
  font-size: 0.85rem;
}
.chosen {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.chosen span {
  color: inherit;
}
.field {
  margin-block-start: 12px;
}
.hint {
  color: var(--tr-text-muted);
  font-size: 0.85rem;
}
.invalid {
  color: var(--ion-color-danger);
}
</style>
