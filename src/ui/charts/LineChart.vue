<script setup lang="ts">
import { computed } from 'vue';

/** Small line chart in SVG; `description` is what screen readers get. */
const props = defineProps<{
  points: readonly { label: string; value: number }[];
  description: string;
  unit: string;
}>();

const W = 320;
const H = 140;
const PAD = 24;

const scaled = computed(() => {
  const values = props.points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = props.points.length > 1 ? (W - 2 * PAD) / (props.points.length - 1) : 0;
  return props.points.map((p, i) => ({
    ...p,
    x: PAD + i * step,
    y: H - PAD - ((p.value - min) / span) * (H - 2 * PAD),
  }));
});
const path = computed(() => scaled.value.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '));
</script>

<template>
  <figure class="chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="description">
      <path :d="path" class="line" />
      <g v-for="p in scaled" :key="p.label">
        <circle :cx="p.x" :cy="p.y" r="4" class="dot" />
        <text :x="p.x" :y="p.y - 8" text-anchor="middle" class="value">
          {{ Math.round(p.value) }}
        </text>
      </g>
      <text :x="PAD" :y="H - 4" class="axis">{{ points[0]?.label }}</text>
      <text :x="W - PAD" :y="H - 4" text-anchor="end" class="axis">{{ points.at(-1)?.label }}</text>
    </svg>
    <figcaption class="unit">{{ unit }}</figcaption>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}
svg {
  width: 100%;
  height: auto;
}
.line {
  fill: none;
  stroke: var(--ion-color-primary);
  stroke-width: 3;
}
.dot {
  fill: var(--ion-color-primary);
}
.value,
.axis {
  font-size: 10px;
  fill: var(--ion-text-color, #000);
}
.axis {
  fill: var(--ion-color-medium);
}
.unit {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
</style>
