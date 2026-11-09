<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import type { Component } from 'vue';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ExerciseIllustration as Illustration } from '@/data/catalog/exerciseImages';
import type { Source } from '@/data/content/sources';
import type { GuidedStep } from '@/domain/guidedSteps';
import type { GuidedLabels } from './guidedLabels';
import { stepsMinutes } from '@/domain/guidedSteps';
import ExerciseIllustration from '@/ui/ExerciseIllustration.vue';
import MuscleMap from '@/ui/muscleMap/MuscleMap.vue';
import { playRestOver, unlockSound } from '@/ui/session/restSound';
import { useSettings } from '@/ui/useSettings';

/**
 * Steps that follow each other with a countdown, one at a time: the joint
 * warm-up before a session, the stretches at any time. Once started, the steps
 * follow each other on their own (a beep at each change). For a move done on
 * one side then the other, a beep at half time says to change sides.
 *
 * The parent keeps the step reached (`index`) and moves it on `step`.
 */
const props = defineProps<{
  steps: readonly GuidedStep[];
  index: number;
  /** Translation keys of this routine's labels. */
  labels: GuidedLabels;
  /** Name and how-to of a step, translated. */
  moveText: (id: string, field: 'name' | 'how') => string;
  partIcon: Component;
  sources: readonly Source[];
  illustrationFor?: (id: string) => Illustration | undefined;
}>();
const emit = defineEmits<{ step: [index: number]; finish: []; skip: [] }>();

const { t } = useI18n();
const { settings } = useSettings();

const minutes = computed(() => stepsMinutes(props.steps));
const index = computed(() => Math.min(props.index, props.steps.length - 1));
const current = computed(() => props.steps[index.value]);
const illustration = computed(() =>
  current.value ? props.illustrationFor?.(current.value.id) : undefined,
);
const isLast = computed(() => index.value === props.steps.length - 1);
const nameOf = (id: string) => props.moveText(id, 'name');

// Countdown of a step. The end time is absolute: it stays right after the screen was off.
const endsAt = ref<number>();
const pausedLeft = ref<number>();
const timeUp = ref(false);
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | undefined;
/** The timer ran out on its own: the next step starts its countdown right away. */
let autoStart = false;

const totalMs = computed(() => (current.value?.seconds ?? 0) * 1000);
const leftMs = computed(() =>
  endsAt.value !== undefined
    ? Math.max(0, endsAt.value - now.value)
    : (pausedLeft.value ?? totalMs.value),
);
const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const dash = computed(() =>
  totalMs.value > 0 ? CIRCUMFERENCE * (leftMs.value / totalMs.value) : 0,
);

function beep(pattern: number[]): void {
  navigator.vibrate?.(pattern);
  if (settings.value?.restSound !== false) playRestOver();
}
function stopTicker(): void {
  clearInterval(ticker);
  ticker = undefined;
}
function resetTimer(): void {
  stopTicker();
  endsAt.value = undefined;
  pausedLeft.value = undefined;
  timeUp.value = false;
}
function startTimer(): void {
  unlockSound();
  endsAt.value = Date.now() + leftMs.value;
  pausedLeft.value = undefined;
  now.value = Date.now();
  stopTicker();
  ticker = setInterval(() => {
    now.value = Date.now();
    if (endsAt.value !== undefined && now.value >= endsAt.value) {
      stopTicker();
      endsAt.value = undefined;
      pausedLeft.value = 0;
      timeUp.value = true;
      beep([300, 150, 300]);
      // Hands free: the next step starts on its own.
      if (!isLast.value) go(1, true);
    }
  }, 250);
}
function pauseTimer(): void {
  pausedLeft.value = leftMs.value;
  endsAt.value = undefined;
  stopTicker();
}
watch(index, async () => {
  resetTimer();
  if (!autoStart) return;
  autoStart = false;
  await nextTick();
  startTimer();
});
onBeforeUnmount(stopTicker);

const running = computed(() => endsAt.value !== undefined);
const started = computed(() => running.value || pausedLeft.value !== undefined);

/** One side, then the other: the second half of the countdown. */
const secondSide = computed(
  () =>
    current.value?.sides === true &&
    started.value &&
    !timeUp.value &&
    leftMs.value <= totalMs.value / 2,
);
watch(secondSide, (now, before) => {
  if (now && !before && running.value) beep([200]);
});

function go(delta: -1 | 1, auto = false): void {
  if (delta === 1 && isLast.value) {
    emit('finish');
    return;
  }
  autoStart = auto;
  emit('step', Math.max(0, index.value + delta));
}
</script>

<template>
  <section v-if="current" class="guided" :aria-label="t(labels.title)">
    <header class="head">
      <p class="eyebrow">{{ t(labels.title) }} · {{ t('guided.minutes', { minutes }) }}</p>
      <p class="count">
        {{ t(labels.stepOf, { index: index + 1, total: steps.length }) }}
      </p>
      <span class="segments" aria-hidden="true">
        <span
          v-for="(s, i) in steps"
          :key="s.id"
          class="segment"
          :class="i < index ? 'is-done' : i === index ? 'is-current' : undefined"
        />
      </span>
    </header>

    <p class="part">
      <component :is="partIcon" :size="18" aria-hidden="true" />
      {{ t(labels.part) }}
    </p>
    <h2 class="name">{{ nameOf(current.id) }}</h2>
    <ExerciseIllustration
      v-if="illustration"
      :key="current.id"
      :illustration="illustration"
      class="move-drawing"
      :name="nameOf(current.id)"
    />
    <!-- Without a licensed drawing: the muscles stretched, on the body map. -->
    <div v-else-if="current.muscles && current.muscles.length > 0" class="muscles">
      <MuscleMap :key="current.id" :primary="current.muscles" :secondary="[]" />
    </div>
    <p v-if="current.muscles && current.muscles.length > 0" class="muscles-list">
      {{
        t('guided.muscles', { muscles: current.muscles.map((m) => t(`muscles.${m}`)).join(', ') })
      }}
    </p>
    <p class="how">{{ moveText(current.id, 'how') }}</p>

    <div class="timer" role="timer" :aria-label="t('guided.timerLabel', { time: clock(leftMs) })">
      <div class="dial">
        <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" :r="RADIUS" />
          <circle
            class="progress"
            cx="60"
            cy="60"
            :r="RADIUS"
            :stroke-dasharray="`${dash} ${CIRCUMFERENCE}`"
          />
        </svg>
        <span class="time" aria-hidden="true">{{ timeUp ? '✓' : clock(leftMs) }}</span>
      </div>
      <p v-if="current.sides && !timeUp" class="side" :class="{ 'is-second': secondSide }">
        {{
          !started
            ? t('guided.sides', { seconds: current.seconds / 2 })
            : secondSide
              ? t('guided.sideTwo')
              : t('guided.sideOne')
        }}
      </p>
      <p v-if="timeUp" class="time-up" role="status">{{ t('guided.timeUp') }}</p>
      <ion-button v-else-if="running" fill="outline" @click="pauseTimer">
        {{ t('guided.pause') }}
      </ion-button>
      <ion-button v-else expand="block" size="large" @click="startTimer">
        {{ started ? t('guided.resume') : t('guided.startTimer') }}
      </ion-button>
    </div>

    <ion-button
      class="next-step"
      expand="block"
      size="large"
      :fill="timeUp || isLast ? 'solid' : 'outline'"
      @click="go(1)"
    >
      {{ isLast ? t(labels.finish) : t(labels.next) }}
    </ion-button>
    <div class="tools">
      <ion-button v-if="index > 0" fill="clear" color="medium" @click="go(-1)">
        {{ t(labels.previous) }}
      </ion-button>
      <ion-button fill="clear" color="medium" @click="emit('skip')">
        {{ t(labels.skip) }}
      </ion-button>
    </div>
    <p class="why">{{ t(labels.why) }}</p>
    <details class="review">
      <summary>{{ t('guided.review') }}</summary>
      <ul>
        <li v-for="source in sources" :key="source.id">
          <a :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
/* The body map, small: the countdown stays on screen. */
.muscles {
  margin-block-end: 4px;
}
.muscles :deep(.body) {
  width: min(40%, 110px);
}
.muscles :deep(.legend) {
  display: none;
}
.muscles-list {
  margin: 0 0 var(--tr-space-2);
  text-align: center;
  font-size: 0.85rem;
  color: var(--tr-text-muted);
}
.side {
  margin: 0;
  font-weight: 700;
  text-align: center;
}
.side.is-second {
  color: var(--ion-color-primary);
}
/* Smaller than on an exercise card: the countdown stays on screen. */
.move-drawing :deep(.frames img) {
  height: 160px;
  max-height: 160px;
}
.move-drawing {
  margin-block-end: var(--tr-space-2);
}
.guided {
  margin-block: 0 var(--tr-space-4);
  padding: var(--tr-space-4);
  border-radius: var(--tr-radius-l);
  background: var(--ion-card-background);
  box-shadow: var(--tr-shadow-1);
}
.head {
  margin-block-end: var(--tr-space-3);
}
.eyebrow {
  margin: 0;
  font-weight: 800;
  color: var(--ion-color-primary);
}
.count {
  margin: 2px 0 6px;
  font-size: 0.85rem;
  color: var(--tr-text-muted);
}
.segments {
  display: flex;
  gap: 4px;
}
.segment {
  flex: 1;
  height: 6px;
  border-radius: var(--tr-radius-pill);
  background: var(--tr-surface-2);
}
.segment.is-done {
  background: var(--ion-color-success);
}
.segment.is-current {
  background: var(--ion-color-primary);
}
.part {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--tr-text-muted);
}
.name {
  margin: 4px 0;
  font-size: var(--tr-font-xl);
  font-weight: var(--tr-weight-black);
  line-height: 1.1;
}
.how {
  margin: 0 0 6px;
}
.why,
.review {
  margin: 0 0 var(--tr-space-3);
  font-size: 0.85rem;
  color: var(--tr-text-muted);
}
.review {
  margin: var(--tr-space-2) 0 0;
  font-size: 0.75rem;
}
.review summary {
  cursor: pointer;
}
.review ul {
  padding-inline-start: 1.2em;
}
.timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tr-space-2);
  margin-block: var(--tr-space-3);
}
.timer ion-button {
  align-self: stretch;
}
.dial {
  position: relative;
  width: 150px;
  height: 150px;
}
.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 9;
}
.track {
  stroke: var(--ion-color-primary);
  opacity: 0.2;
}
.progress {
  stroke: var(--ion-color-primary);
  stroke-linecap: round;
  transition: stroke-dasharray 0.25s linear;
}
.time {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: var(--tr-weight-black);
  font-variant-numeric: tabular-nums;
}
.time-up {
  margin: 0;
  font-weight: 800;
  color: var(--ion-color-success);
}
.next-step {
  min-height: 56px;
}
.tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
</style>
