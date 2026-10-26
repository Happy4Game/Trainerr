<script setup lang="ts">
import { computed } from 'vue';

/**
 * Line chart with one or two series, light grid and the last value written.
 * SVG only; `description` is what screen readers get (the figure is an image),
 * the legend is text so the colour is never the only cue.
 */
const props = defineProps<{
  points: readonly { label: string; value: number; value2?: number }[];
  description: string;
  legend: string;
  legend2?: string;
  format: (value: number) => string;
}>();

const W = 320;
const H = 160;
const PAD_X = 12;
const PAD_TOP = 20;
const PAD_BOTTOM = 22;

const range = computed(() => {
  const values = props.points.flatMap((p) =>
    p.value2 === undefined ? [p.value] : [p.value, p.value2],
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  return { min: min - span * 0.12, max: max + span * 0.12 };
});
const x = (i: number) =>
  props.points.length > 1 ? PAD_X + (i * (W - 2 * PAD_X)) / (props.points.length - 1) : W / 2;
const y = (value: number) =>
  PAD_TOP +
  (1 - (value - range.value.min) / (range.value.max - range.value.min)) *
    (H - PAD_TOP - PAD_BOTTOM);

const line = (key: 'value' | 'value2') =>
  props.points
    .map((p, i) => {
      const v = p[key];
      return v === undefined ? '' : `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    })
    .join(' ');
const main = computed(() => line('value'));
const second = computed(() => (props.legend2 ? line('value2') : ''));
const area = computed(() =>
  props.points.length > 1
    ? `${main.value} L${x(props.points.length - 1)},${H - PAD_BOTTOM} L${x(0)},${H - PAD_BOTTOM} Z`
    : '',
);
const grid = computed(() => [0.25, 0.5, 0.75].map((f) => PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)));
const last = computed(() => {
  const i = props.points.length - 1;
  const p = props.points[i];
  return p ? { x: x(i), y: y(p.value), text: props.format(p.value) } : undefined;
});
</script>

<template>
  <figure class="trend">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="description">
      <defs>
        <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" class="fill-top" />
          <stop offset="100%" class="fill-bottom" />
        </linearGradient>
      </defs>
      <line v-for="g in grid" :key="g" :x1="0" :x2="W" :y1="g" :y2="g" class="grid" />
      <path v-if="area" :d="area" fill="url(#trend-fill)" />
      <path v-if="second" :d="second" class="line second" />
      <path :d="main" class="line main" />
      <circle
        v-for="(p, i) in points"
        :key="i"
        :cx="x(i)"
        :cy="y(p.value)"
        :r="i === points.length - 1 ? 5 : 2.5"
        class="dot"
      />
      <text
        v-if="last"
        :x="Math.min(last.x, W - 4)"
        :y="Math.max(12, last.y - 10)"
        text-anchor="end"
        class="last"
      >
        {{ last.text }}
      </text>
      <text :x="PAD_X" :y="H - 4" class="axis">{{ points[0]?.label }}</text>
      <text :x="W - PAD_X" :y="H - 4" text-anchor="end" class="axis">
        {{ points.at(-1)?.label }}
      </text>
    </svg>
    <figcaption class="legend">
      <span><i class="swatch main" aria-hidden="true" />{{ legend }}</span>
      <span v-if="legend2"><i class="swatch second" aria-hidden="true" />{{ legend2 }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.trend {
  margin: 0;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.grid {
  stroke: var(--tr-chart-grid);
  stroke-width: 1;
}
.fill-top {
  stop-color: var(--tr-chart-1);
  stop-opacity: 0.28;
}
.fill-bottom {
  stop-color: var(--tr-chart-1);
  stop-opacity: 0;
}
.line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.line.main {
  stroke: var(--tr-chart-1);
}
.line.second {
  stroke: var(--tr-chart-2);
  stroke-width: 2;
  stroke-dasharray: 5 5;
}
.dot {
  fill: var(--tr-chart-1);
  stroke: var(--tr-surface);
  stroke-width: 2;
}
.last {
  font-size: 12px;
  font-weight: 800;
  fill: var(--tr-text);
}
.axis {
  font-size: 10px;
  fill: var(--tr-text-muted);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tr-space-1) var(--tr-space-4);
  margin-top: var(--tr-space-2);
  font-size: var(--tr-font-xs);
  color: var(--tr-text-muted);
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 3px;
  margin-inline-end: 6px;
  vertical-align: middle;
  border-radius: 2px;
}
.swatch.main {
  background: var(--tr-chart-1);
}
.swatch.second {
  background: repeating-linear-gradient(90deg, var(--tr-chart-2) 0 4px, transparent 4px 7px);
}
</style>
