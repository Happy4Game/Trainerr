<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { RotateCw } from 'lucide-vue-next';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { JOINT_WARMUP_SOURCE_IDS, sourceById } from '@/data/content/sources';
import { guidedWarmup, warmupMinutes } from '@/domain/guidedWarmup';
import { useSettings } from '@/ui/useSettings';
import { playRestOver, unlockSound } from './restSound';
import { useSession } from './useSession';

/**
 * Guided joint warm-up before the first machine, one move at a time like the
 * session: what to do, how, and a countdown. Once started, the moves follow
 * each other on their own (a beep at each change). Recommended, never
 * imposed: "Passer l'échauffement guidé" at every step.
 */
const { t } = useI18n();
const session = useSession();
const { settings } = useSettings();

const steps = computed(() => guidedWarmup(session.sessionMuscles.value));
const sources = JOINT_WARMUP_SOURCE_IDS.map(sourceById).filter((s) => s !== undefined);
const minutes = computed(() => warmupMinutes(steps.value));
const index = computed(() =>
  Math.min(session.active.value?.plan.guidedWarmup?.step ?? 0, steps.value.length - 1),
);
const current = computed(() => steps.value[index.value]);
const isLast = computed(() => index.value === steps.value.length - 1);

// Countdown of a timed step. The end time is absolute: it stays right after the screen was off.
const endsAt = ref<number>();
const pausedLeft = ref<number>();
const timeUp = ref(false);
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | undefined;

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
      navigator.vibrate?.([300, 150, 300]);
      if (settings.value?.restSound !== false) playRestOver();
      // Hands free: the next move starts on its own.
      if (!isLast.value) void go(1, true);
    }
  }, 250);
}
function pauseTimer(): void {
  pausedLeft.value = leftMs.value;
  endsAt.value = undefined;
  stopTicker();
}
watch(index, resetTimer);
onBeforeUnmount(stopTicker);

const running = computed(() => endsAt.value !== undefined);
const started = computed(() => running.value || pausedLeft.value !== undefined);

async function go(delta: -1 | 1, autoStart = false): Promise<void> {
  if (delta === 1 && isLast.value) {
    await session.endGuidedWarmup(false);
    return;
  }
  await session.guidedWarmupStep(Math.max(0, index.value + delta));
  if (autoStart) {
    await nextTick();
    startTimer();
  }
}
</script>

<template>
  <section v-if="current" class="guided" :aria-label="t('guidedWarmup.title')">
    <header class="head">
      <p class="eyebrow">
        {{ t('guidedWarmup.title') }} · {{ t('guidedWarmup.minutes', { minutes }) }}
      </p>
      <p class="count">
        {{ t('guidedWarmup.stepOf', { index: index + 1, total: steps.length }) }}
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
      <RotateCw :size="18" aria-hidden="true" />
      {{ t('guidedWarmup.joints') }}
    </p>
    <h2 class="name">{{ t(`mobility.moves.${current.id}.name`) }}</h2>
    <p class="how">{{ t(`mobility.moves.${current.id}.how`) }}</p>

    <div
      class="timer"
      role="timer"
      :aria-label="t('guidedWarmup.timerLabel', { time: clock(leftMs) })"
    >
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
      <p v-if="timeUp" class="time-up" role="status">{{ t('guidedWarmup.timeUp') }}</p>
      <ion-button v-else-if="running" fill="outline" @click="pauseTimer">
        {{ t('guidedWarmup.pause') }}
      </ion-button>
      <ion-button v-else expand="block" size="large" @click="startTimer">
        {{ started ? t('guidedWarmup.resume') : t('guidedWarmup.startTimer') }}
      </ion-button>
    </div>

    <ion-button
      class="next-step"
      expand="block"
      size="large"
      :fill="timeUp || isLast ? 'solid' : 'outline'"
      @click="go(1)"
    >
      {{ isLast ? t('guidedWarmup.finish') : t('guidedWarmup.next') }}
    </ion-button>
    <div class="tools">
      <ion-button v-if="index > 0" fill="clear" color="medium" @click="go(-1)">
        {{ t('guidedWarmup.previous') }}
      </ion-button>
      <ion-button fill="clear" color="medium" @click="session.endGuidedWarmup(true)">
        {{ t('guidedWarmup.skip') }}
      </ion-button>
    </div>
    <p class="why">{{ t('guidedWarmup.why') }}</p>
    <details class="review">
      <summary>{{ t('guidedWarmup.review') }}</summary>
      <ul>
        <li v-for="source in sources" :key="source.id">
          <a :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
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
