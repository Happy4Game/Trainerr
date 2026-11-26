<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettings } from '@/ui/useSettings';
import { celebration, celebrationOver, decorationsOn } from './celebrate';
import MascotFigure from './MascotFigure.vue';

/**
 * Above every screen, never in the way: the mascot walks in carrying a trophy,
 * cheers in the middle of the screen, then walks out. A session ends with
 * confetti too. Nothing here takes a tap (pointer-events: none) and nothing is
 * read aloud: the screen itself already says what happened.
 */
const { t } = useI18n();
const { settings } = useSettings();
const shown = computed(() =>
  celebration.value && decorationsOn(settings.value) ? celebration.value : undefined,
);

/** 36 pieces, spread over the width, with their own colour, delay and spin. */
const COLORS = ['#ff8a3d', '#3ddc84', '#facc15', '#60a5fa', '#f472b6'];
const confetti = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 97) % 100}%`,
  color: COLORS[i % COLORS.length],
  delay: `${(i % 9) * 0.08}s`,
  duration: `${2 + (i % 5) * 0.25}s`,
  spin: `${i % 2 ? '' : '-'}${360 + (i % 4) * 180}deg`,
  drift: `${((i % 7) - 3) * 14}px`,
}));

// Safety net: the layer always empties itself, even if an animation event is lost.
let timer: ReturnType<typeof setTimeout> | undefined;
watch(shown, (now) => {
  clearTimeout(timer);
  if (now) timer = setTimeout(() => celebrationOver(now.id), 5500);
});
onBeforeUnmount(() => clearTimeout(timer));
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
          animationDelay: c.delay,
          animationDuration: c.duration,
          '--spin': c.spin,
          '--drift': c.drift,
        }"
      />
    </template>
    <div
      class="walker"
      :class="shown.entrance"
      data-testid="mascot"
      @animationend.self="celebrationOver(shown.id)"
    >
      <p class="bubble">{{ t(shown.line) }}</p>
      <MascotFigure :pose="shown.pose" :walking="shown.entrance === 'walk'" class="mascot" />
    </div>
  </div>
</template>

<style scoped>
.layer {
  position: fixed;
  inset: 0;
  z-index: 30000;
  overflow: hidden;
  pointer-events: none;
}

/*
 * Four ways in, each with a pause in the middle of the screen, where the
 * bubble shows (between 30 % and 70 % of the animation):
 * - walk: crosses from left to right;
 * - peek: rises from the bottom left corner, then sinks back;
 * - drop: falls from the top with a bounce, then shrinks away;
 * - hop: comes in hopping from the right, then hops back out.
 */
.walker {
  --length: 4.5s;
  position: absolute;
  left: 0;
  bottom: calc(var(--ion-safe-area-bottom, 0px) + 84px);
  width: 96px;
  animation: walk-across var(--length) cubic-bezier(0.45, 0, 0.55, 1) forwards;
}
@keyframes walk-across {
  0% {
    transform: translateX(-120px);
  }
  32%,
  68% {
    transform: translateX(calc(50vw - 48px));
  }
  100% {
    transform: translateX(calc(100vw + 24px));
  }
}
.walker.peek {
  --length: 3.6s;
  left: 16px;
  animation-name: peek;
}
@keyframes peek {
  0% {
    transform: translateY(calc(100% + 120px));
  }
  25%,
  75% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(calc(100% + 120px));
  }
}
.walker.drop {
  --length: 3.8s;
  left: calc(50vw - 48px);
  animation-name: drop;
  animation-timing-function: ease-in;
}
@keyframes drop {
  0% {
    transform: translateY(-110vh);
  }
  20% {
    transform: translateY(0) scale(1.1, 0.9);
  }
  26% {
    transform: translateY(-24px);
  }
  32% {
    transform: translateY(0);
  }
  72% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
}
.walker.hop {
  --length: 4.2s;
  left: auto;
  right: 0;
  animation-name: hop-in;
  animation-timing-function: linear;
}
@keyframes hop-in {
  0% {
    transform: translate(120px, 0);
  }
  8% {
    transform: translate(calc(-12vw + 60px), -40px);
  }
  16% {
    transform: translate(calc(-25vw + 20px), 0);
  }
  23% {
    transform: translate(calc(-38vw - 12px), -40px);
  }
  30%,
  70% {
    transform: translate(calc(-50vw + 48px), 0);
  }
  80% {
    transform: translate(calc(-25vw + 48px), -50px);
  }
  100% {
    transform: translate(140px, 0);
  }
}
.mascot {
  display: block;
  width: 96px;
  filter: drop-shadow(0 6px 8px rgb(0 0 0 / 30%));
}

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
  transform: translateX(var(--bx)) scale(0.6);
  animation: bubble var(--length) ease forwards;
}
/* In the corner, the bubble opens to the right so it stays on screen. */
.peek .bubble {
  --bx: 0%;
  left: 8px;
  transform-origin: 20px 100%;
}
/* Little tail under the bubble. */
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
  30% {
    opacity: 0;
    transform: translateX(var(--bx)) scale(0.6);
  }
  36%,
  66% {
    opacity: 1;
    transform: translateX(var(--bx)) scale(1);
  }
  72%,
  100% {
    opacity: 0;
    transform: translateX(var(--bx)) scale(0.6);
  }
}

.confetto {
  position: absolute;
  top: -16px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0.9;
  animation-name: fall;
  animation-timing-function: cubic-bezier(0.3, 0.4, 0.6, 1);
  animation-fill-mode: forwards;
}
@keyframes fall {
  to {
    transform: translate(var(--drift), 105vh) rotate(var(--spin));
    opacity: 0.6;
  }
}
</style>
