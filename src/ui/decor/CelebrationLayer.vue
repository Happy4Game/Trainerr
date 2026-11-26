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
    <template v-if="shown.kind === 'session'">
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
    <div class="walker" @animationend.self="celebrationOver(shown.id)">
      <p class="bubble">
        {{ shown.kind === 'record' ? t('decor.record') : t('decor.bravo') }}
      </p>
      <MascotFigure class="mascot" />
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

/* In, a cheer in the middle, out: 4.5 s in all. */
.walker {
  position: absolute;
  left: 0;
  bottom: calc(var(--ion-safe-area-bottom, 0px) + 84px);
  width: 96px;
  animation: walk-across 4.5s cubic-bezier(0.45, 0, 0.55, 1) forwards;
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
.mascot {
  display: block;
  width: 96px;
  filter: drop-shadow(0 6px 8px rgb(0 0 0 / 30%));
}

.bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin: 0 0 6px;
  padding: 6px 12px;
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface);
  color: var(--tr-text);
  box-shadow: var(--tr-shadow-2);
  font-weight: var(--tr-weight-black);
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-50%) scale(0.6);
  animation: bubble 4.5s ease forwards;
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
@keyframes bubble {
  0%,
  30% {
    opacity: 0;
    transform: translateX(-50%) scale(0.6);
  }
  36%,
  66% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  72%,
  100% {
    opacity: 0;
    transform: translateX(-50%) scale(0.6);
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
