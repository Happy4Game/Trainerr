<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { Minus, Plus } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUnits } from '@/ui/useUnits';
import { adjacentLoads, DEFAULT_PLATE_CONFIG, platesFor, type BarLoading } from '@/domain/plates';

const props = defineProps<{ loadKg: number }>();
const emit = defineEmits<{ change: [loadKg: number] }>();

const { t, n } = useI18n();
const { load } = useUnits();
const config = DEFAULT_PLATE_CONFIG;
const target = ref(props.loadKg);
watch(
  () => props.loadKg,
  (value) => (target.value = value),
);

const result = computed(() => platesFor(target.value, config));
const shown = computed<BarLoading | undefined>(() =>
  result.value.exact ? result.value.loading : (result.value.below ?? result.value.above),
);
const neighbours = computed(() => adjacentLoads(target.value, config));

// Competition colours (to be checked before being frozen); the weight is always written too.
const COLORS: Record<number, string> = {
  25: '#d32f2f',
  20: '#1565c0',
  15: '#f9a825',
  10: '#2e7d32',
  5: '#eeeeee',
  2.5: '#424242',
  1.25: '#9e9e9e',
};
const heightFor = (kg: number) => 40 + Math.min(kg, 25) * 4.4;

function move(to: number | undefined): void {
  if (to === undefined) return;
  target.value = to;
  emit('change', to);
}
</script>

<template>
  <div class="plates">
    <div class="controls">
      <ion-button
        fill="outline"
        :disabled="neighbours.lower === undefined"
        :aria-label="t('session.plates.lighter')"
        @click="move(neighbours.lower)"
      >
        <Minus :size="22" aria-hidden="true" />
      </ion-button>
      <strong class="total">{{ load(target) }}</strong>
      <ion-button
        fill="outline"
        :disabled="neighbours.higher === undefined"
        :aria-label="t('session.plates.heavier')"
        @click="move(neighbours.higher)"
      >
        <Plus :size="22" aria-hidden="true" />
      </ion-button>
    </div>

    <p v-if="!result.exact" role="status">
      {{
        t('session.plates.closest', {
          below: result.below ? load(result.below.totalKg) : '—',
          above: result.above ? load(result.above.totalKg) : '—',
        })
      }}
    </p>

    <template v-if="shown">
      <svg
        viewBox="0 0 320 160"
        class="drawing"
        role="img"
        :aria-label="
          t('session.plates.perSide', {
            plates: shown.perSide.map((kg) => n(kg)).join(' + ') || '0',
          })
        "
      >
        <rect x="0" y="74" width="320" height="12" rx="3" class="bar" />
        <rect x="56" y="62" width="10" height="36" rx="2" class="collar" />
        <g v-for="(kg, index) in shown.perSide" :key="index">
          <rect
            :x="70 + index * 24"
            :y="80 - heightFor(kg) / 2"
            width="20"
            :height="heightFor(kg)"
            rx="3"
            :fill="COLORS[kg] ?? '#757575'"
            class="plate"
          />
          <text :x="80 + index * 24" y="156" text-anchor="middle" class="label">{{ n(kg) }}</text>
        </g>
      </svg>
      <p>
        {{
          t('session.plates.perSide', {
            plates: shown.perSide.map((kg) => n(kg)).join(' + ') || '0',
          })
        }}
        · {{ t('session.plates.bar', { kg: n(config.barKg) }) }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.total {
  min-width: 6ch;
  font-size: 1.5rem;
  text-align: center;
}
.drawing {
  width: 100%;
  max-width: 420px;
  display: block;
  margin-inline: auto;
}
.bar,
.collar {
  fill: var(--ion-color-medium);
}
.plate {
  stroke: var(--ion-color-dark);
  stroke-width: 1;
}
.label {
  font-size: 11px;
  fill: var(--ion-text-color, #000);
}
</style>
