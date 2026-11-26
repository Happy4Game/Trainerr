<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettings } from '@/ui/useSettings';
import { celebration, celebrationOver, decorationsOn } from './celebrate';
import MascotFigure from './MascotFigure.vue';
import type { MascotEntrance } from './mascotLines';

/**
 * Above every screen, never in the way: the mascot comes in, cheers in the
 * middle with a speech bubble, then leaves. A session ends with confetti too.
 * Nothing here takes a tap (pointer-events: none) and nothing is read aloud:
 * the screen itself already says what happened.
 *
 * The motion follows the classic principles of animation (Thomas & Johnston,
 * "The Illusion of Life", 1981): slow in and slow out, arcs, anticipation (a
 * crouch before a jump), squash and stretch (on landing), follow-through (a
 * small rebound). Two layers move separately: `.walker` travels across the
 * screen, `.jumper` hops, lands and leans.
 */
const { t } = useI18n();
const { settings } = useSettings();
const shown = computed(() =>
  celebration.value && decorationsOn(settings.value) ? celebration.value : undefined,
);

/** Length of each entrance, in ms. */
const LENGTH: Readonly<Record<MascotEntrance, number>> = {
  walk: 4400,
  peek: 3600,
  pop: 3600,
  hop: 3800,
};

/** 40 pieces, spread over the width, each with its colour, delay, spin and sway. */
const COLORS = ['#ff8a3d', '#3ddc84', '#facc15', '#60a5fa', '#f472b6'];
const confetti = Array.from({ length: 40 }, (_, i) => {
  const delay = `${(i % 10) * 0.07}s`;
  const duration = `${2.4 + (i % 5) * 0.3}s`;
  return {
    left: `${(i * 97) % 100}%`,
    color: COLORS[i % COLORS.length],
    delays: `${delay}, ${delay}, ${delay}`,
    durations: `${duration}, ${duration}, ${0.5 + (i % 3) * 0.2}s`,
    spin: `${i % 2 ? '' : '-'}${540 + (i % 4) * 180}deg`,
    drift: `${((i % 7) - 3) * 18}px`,
  };
});

/**
 * The legs walk only while the mascot travels: they stop while it stands in
 * the middle (33 % to 67 % of the walk), like a real walk.
 */
const legsMoving = ref(false);
let timers: ReturnType<typeof setTimeout>[] = [];
function clearTimers(): void {
  timers.forEach(clearTimeout);
  timers = [];
}
watch(shown, (now) => {
  clearTimers();
  if (!now) return;
  const length = LENGTH[now.entrance];
  legsMoving.value = now.entrance === 'walk';
  if (now.entrance === 'walk') {
    timers.push(setTimeout(() => (legsMoving.value = false), length * 0.3));
    timers.push(setTimeout(() => (legsMoving.value = true), length * 0.66));
    timers.push(setTimeout(() => (legsMoving.value = false), length * 0.86));
  }
  // Safety net: the layer always empties itself, even if an animation event is lost.
  timers.push(setTimeout(() => celebrationOver(now.id), length + 800));
});
onBeforeUnmount(clearTimers);
</script>

<template>
  <div v-if="shown" :key="shown.id" class="layer" aria-hidden="true" data-testid="celebration">
    <template v-if="shown.confetti">
      <span
        v-for="(c, i) in confetti"
        :key="i"
        class="confetto"
        :style="{
          left: c.left,
          background: c.color,
          animationDelay: c.delays,
          animationDuration: c.durations,
          '--spin': c.spin,
          '--drift': c.drift,
        }"
      />
    </template>
    <!-- The stage stops above the tab bar: the mascot comes from behind it, never over it. -->
    <div class="stage">
      <div
        class="walker"
        :class="shown.entrance"
        :style="{ '--length': `${LENGTH[shown.entrance]}ms` }"
        data-testid="mascot"
      >
        <div class="jumper" @animationend.self="celebrationOver(shown.id)">
          <p class="bubble">{{ t(shown.line) }}</p>
          <MascotFigure :pose="shown.pose" :walking="legsMoving" class="mascot" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer {
  /* Easing: "in" speeds up (leaving, falling), "out" slows down (arriving), "back" overshoots. */
  --ease-in: cubic-bezier(0.55, 0, 0.85, 0.4);
  --ease-out: cubic-bezier(0.15, 0.6, 0.35, 1);
  --ease-back: cubic-bezier(0.34, 1.5, 0.64, 1);
  position: fixed;
  inset: 0;
  z-index: 30000;
  overflow: hidden;
  pointer-events: none;
}

/* The tab bar is about 64 px high, above the phone's own navigation bar. */
.stage {
  position: absolute;
  inset: 0 0 calc(var(--ion-safe-area-bottom, 0px) + 64px);
  overflow: clip;
}
.walker {
  --travel: 90px;
  position: absolute;
  left: calc(50% - 48px);
  bottom: 14px;
  width: 96px;
  animation: none var(--length) linear forwards;
}
.jumper {
  position: relative;
  transform-origin: 50% 100%;
  animation: none var(--length) linear forwards;
}
.mascot {
  display: block;
  width: 96px;
  filter: drop-shadow(0 6px 8px rgb(0 0 0 / 30%));
}

/*
 * walk: springs up a few steps away, walks to the middle (slowing down),
 * a hop of joy, walks on a few steps (speeding up), then shrinks away
 * after a small crouch. It leans forward while walking.
 */
.walk {
  animation-name: walk-x;
}
@keyframes walk-x {
  0%,
  8% {
    transform: translateX(calc(-1 * var(--travel)));
    animation-timing-function: var(--ease-out);
  }
  30%,
  66% {
    transform: none;
    animation-timing-function: var(--ease-in);
  }
  86%,
  100% {
    transform: translateX(var(--travel));
  }
}
.walk .jumper {
  animation-name: walk-body;
}
@keyframes walk-body {
  0% {
    transform: scale(0);
    animation-timing-function: var(--ease-back);
  }
  8% {
    transform: rotate(5deg);
    animation-timing-function: var(--ease-out);
  }
  30% {
    transform: none;
    animation-timing-function: var(--ease-out);
  }
  /* Crouch, hop, land (squash), settle. */
  37% {
    transform: scale(1.06, 0.92);
    animation-timing-function: var(--ease-out);
  }
  42% {
    transform: translateY(-26px) scale(0.96, 1.05);
    animation-timing-function: var(--ease-in);
  }
  47% {
    transform: translateY(0) scale(1.08, 0.92);
    animation-timing-function: var(--ease-out);
  }
  51%,
  66% {
    transform: none;
    animation-timing-function: var(--ease-in);
  }
  80%,
  86% {
    transform: rotate(5deg);
    animation-timing-function: var(--ease-out);
  }
  90% {
    transform: scale(1.12, 0.86);
    animation-timing-function: var(--ease-in);
  }
  100% {
    transform: scale(0);
  }
}

/* peek: rises from behind the tab bar, in the corner, tilts its head, then sinks back. */
.peek {
  left: 16px;
}
.peek .jumper {
  animation-name: peek-body;
}
@keyframes peek-body {
  0% {
    transform: translateY(calc(100% + 20px));
    animation-timing-function: var(--ease-back);
  }
  20% {
    transform: none;
    animation-timing-function: ease-in-out;
  }
  27% {
    transform: rotate(-6deg);
    animation-timing-function: ease-in-out;
  }
  34%,
  70% {
    transform: none;
    animation-timing-function: var(--ease-out);
  }
  76% {
    transform: translateY(-10px);
    animation-timing-function: var(--ease-in);
  }
  94%,
  100% {
    transform: translateY(calc(100% + 20px));
  }
}

/*
 * pop: springs out of the ground in the middle (stretched, then squashed),
 * wobbles, then crouches, jumps and falls back behind the tab bar.
 */
.pop .jumper {
  animation-name: pop-body;
}
@keyframes pop-body {
  0% {
    transform: scale(0.2, 0);
    animation-timing-function: var(--ease-out);
  }
  12% {
    transform: translateY(-20px) scale(0.92, 1.12);
    animation-timing-function: var(--ease-in);
  }
  20% {
    transform: scale(1.14, 0.86);
    animation-timing-function: var(--ease-out);
  }
  26% {
    transform: scale(0.97, 1.04);
    animation-timing-function: ease-in-out;
  }
  31%,
  68% {
    transform: none;
    animation-timing-function: var(--ease-out);
  }
  74% {
    transform: scale(1.1, 0.88);
    animation-timing-function: var(--ease-out);
  }
  84% {
    transform: translateY(-50px) scale(0.95, 1.06);
    animation-timing-function: var(--ease-in);
  }
  96%,
  100% {
    transform: translateY(calc(100% + 40px));
  }
}

/*
 * hop: jumps out from behind the tab bar on the right, lands in the middle
 * (squash), then jumps back behind the bar on the left. Two layers make the
 * arc: the walker moves sideways at a steady pace, the jumper goes up
 * (slowing down) and down (speeding up), like a thrown ball.
 */
.hop {
  animation-name: hop-x;
}
@keyframes hop-x {
  0% {
    transform: translateX(var(--travel));
    animation-timing-function: linear;
  }
  22%,
  72% {
    transform: none;
    animation-timing-function: linear;
  }
  94%,
  100% {
    transform: translateX(calc(-1 * var(--travel)));
  }
}
.hop .jumper {
  animation-name: hop-body;
}
@keyframes hop-body {
  0% {
    transform: translateY(calc(100% + 40px));
    animation-timing-function: var(--ease-out);
  }
  11% {
    transform: translateY(-50px) scale(0.95, 1.06);
    animation-timing-function: var(--ease-in);
  }
  22% {
    transform: scale(1.12, 0.88);
    animation-timing-function: var(--ease-out);
  }
  27% {
    transform: translateY(-8px) scale(0.98, 1.03);
    animation-timing-function: var(--ease-in);
  }
  31%,
  68% {
    transform: none;
    animation-timing-function: var(--ease-out);
  }
  72% {
    transform: scale(1.1, 0.88);
    animation-timing-function: var(--ease-out);
  }
  83% {
    transform: translateY(-50px) scale(0.95, 1.06);
    animation-timing-function: var(--ease-in);
  }
  94%,
  100% {
    transform: translateY(calc(100% + 40px));
  }
}

/*
 * The bubble pops out of the mascot's head with a small overshoot, and goes
 * back into it quickly (it shrinks towards its tail) instead of a slow fade.
 */
.bubble {
  --bx: -50%;
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: max-content;
  max-width: min(72vw, 260px);
  margin: 0 0 6px;
  padding: 6px 12px;
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface);
  color: var(--tr-text);
  box-shadow: var(--tr-shadow-2);
  font-weight: var(--tr-weight-black);
  text-align: center;
  opacity: 0;
  transform: translateX(var(--bx)) scale(0);
  transform-origin: 50% calc(100% + 6px);
  animation: bubble var(--length) linear forwards;
}
.peek .bubble {
  --bx: 0%;
  left: 8px;
  transform-origin: 32px calc(100% + 6px);
}
.bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border: 6px solid transparent;
  border-top-color: var(--tr-surface);
}
.peek .bubble::after {
  left: 32px;
}
@keyframes bubble {
  0%,
  31% {
    opacity: 0;
    transform: translateX(var(--bx)) scale(0);
    animation-timing-function: var(--ease-back);
  }
  37% {
    opacity: 1;
    transform: translateX(var(--bx)) scale(1);
  }
  63% {
    opacity: 1;
    transform: translateX(var(--bx)) scale(1);
    animation-timing-function: var(--ease-in);
  }
  67%,
  100% {
    opacity: 0;
    transform: translateX(var(--bx)) scale(0);
  }
}

/*
 * Confetti: they fall fast then float down (air drag), spin, sway like paper
 * turning over, and fade out at the bottom instead of vanishing. Three
 * separate properties (translate, rotate, scale), three animations.
 */
.confetto {
  position: absolute;
  top: -16px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0;
  animation-name: fall, spin, sway;
  animation-timing-function: cubic-bezier(0.2, 0.5, 0.45, 1), linear, ease-in-out;
  animation-iteration-count: 1, 1, infinite;
  animation-direction: normal, normal, alternate;
  animation-fill-mode: both, forwards, none;
}
@keyframes fall {
  0% {
    translate: 0 0;
    opacity: 1;
  }
  75% {
    opacity: 1;
  }
  100% {
    translate: var(--drift) 100vh;
    opacity: 0;
  }
}
@keyframes spin {
  to {
    rotate: var(--spin);
  }
}
@keyframes sway {
  from {
    scale: 1 1;
  }
  to {
    scale: 0.2 1;
  }
}
</style>
