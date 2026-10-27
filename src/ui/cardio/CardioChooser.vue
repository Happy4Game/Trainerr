<script setup lang="ts">
import { IonItem, IonToggle } from '@ionic/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  CARDIO_MACHINES,
  cardioMachine,
  recommendedCardioPosition,
  type CardioPlan,
  type CardioPosition,
} from '@/domain/cardio';
import type { SessionTemplate } from '@/domain/trainingModels';
import { useSettings } from '@/ui/useSettings';
import CardioIcon from './CardioIcon.vue';
import { useCardioText } from './useCardioText';

/**
 * Sessions with or without cardio, chosen before starting and kept for the
 * next ones: the machine, the minutes, and before or after the weights, with
 * the advice of the studies for today's session.
 */
const props = defineProps<{ template: SessionTemplate }>();

const MINUTES = [10, 15, 20, 30, 45] as const;
const POSITIONS: readonly CardioPosition[] = ['before', 'after'];

const { t } = useI18n();
const { settings, updateSettings } = useSettings();
const text = useCardioText();

const plan = computed(() => settings.value?.cardio);
const advice = computed(() =>
  recommendedCardioPosition(
    settings.value?.goal ?? 'hypertrophy',
    props.template.groups,
    plan.value ? cardioMachine(plan.value.cardioId) : undefined,
  ),
);

async function change(patch: Partial<CardioPlan>): Promise<void> {
  if (!plan.value) return;
  await updateSettings({ cardio: { ...plan.value, ...patch } });
}
async function toggle(on: boolean): Promise<void> {
  const position = advice.value.position === 'either' ? 'after' : advice.value.position;
  await updateSettings({ cardio: on ? { cardioId: 'bike', minutes: 20, position } : undefined });
}
</script>

<template>
  <ion-item lines="none" class="cardio-toggle">
    <ion-toggle :checked="plan !== undefined" @ion-change="toggle($event.detail.checked)">
      <span class="toggle-title">{{ t('cardio.choose.toggle') }}</span>
      <span class="toggle-help">{{ t('cardio.choose.help') }}</span>
    </ion-toggle>
  </ion-item>
  <section v-if="plan" class="cardio-plan" :aria-label="t('cardio.choose.title')">
    <div class="chips" role="radiogroup" :aria-label="t('cardio.entry.machine')">
      <button
        v-for="m in CARDIO_MACHINES"
        :key="m.id"
        type="button"
        role="radio"
        class="chip"
        :class="{ chosen: m.id === plan.cardioId }"
        :aria-checked="m.id === plan.cardioId"
        @click="change({ cardioId: m.id })"
      >
        <CardioIcon :icon="m.icon" :size="16" />
        {{ text.name(m.id) }}
      </button>
    </div>
    <div class="chips" role="radiogroup" :aria-label="t('cardio.choose.minutes')">
      <button
        v-for="m in MINUTES"
        :key="m"
        type="button"
        role="radio"
        class="chip"
        :class="{ chosen: m === plan.minutes }"
        :aria-checked="m === plan.minutes"
        @click="change({ minutes: m })"
      >
        {{ t('cardio.units.minutes', { n: m }) }}
      </button>
    </div>
    <div class="chips" role="radiogroup" :aria-label="t('cardio.choose.when')">
      <button
        v-for="p in POSITIONS"
        :key="p"
        type="button"
        role="radio"
        class="chip"
        :class="{ chosen: p === plan.position }"
        :aria-checked="p === plan.position"
        @click="change({ position: p })"
      >
        {{ t(`cardio.positions.${p}`) }}
        <span v-if="advice.position === p" class="advised">· {{ t('cardio.choose.advised') }}</span>
      </button>
    </div>
    <p class="advice" role="note">
      {{ t(`cardio.advice.${advice.reason}`) }}
      <router-link to="/tabs/settings/tips">{{ t('cardio.advice.more') }}</router-link>
    </p>
  </section>
</template>

<style scoped>
.cardio-toggle {
  --background: transparent;
  --padding-start: 0;
  margin-block: 4px;
}
.toggle-title {
  display: block;
  font-weight: 600;
}
.toggle-help {
  display: block;
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
  white-space: normal;
}
.cardio-plan {
  display: grid;
  gap: 8px;
  margin-block-end: 8px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 4px 12px;
  border: 1px solid var(--ion-color-primary);
  border-radius: var(--tr-radius-pill);
  background: none;
  color: var(--ion-color-primary);
  font: inherit;
  font-size: 0.85rem;
}
.chip.chosen {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.advised {
  font-weight: 700;
}
.advice {
  margin: 0;
  color: var(--tr-text-muted);
  font-size: 0.85rem;
}
</style>
