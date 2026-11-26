<script setup lang="ts">
import { computed } from 'vue';
import { useSettings } from '@/ui/useSettings';
import { decorationsOn } from './celebrate';

/**
 * Two waves rolling at different speeds at the bottom of a card, purely for
 * the look. With `level` (0 to 1) the water fills that share of the card:
 * the rest timer empties it as the time runs out. The parent needs
 * `position: relative; isolation: isolate; overflow: hidden`.
 */
const props = defineProps<{ level?: number }>();
const { settings } = useSettings();
const height = computed(() =>
  props.level === undefined
    ? undefined
    : `${Math.round(Math.min(1, Math.max(0, props.level)) * 100)}%`,
);
/** One wave length, drawn twice side by side: sliding by half loops seamlessly. */
const WAVE = 'M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 V40 H0 Z';
</script>

<template>
  <div
    v-if="decorationsOn(settings)"
    class="waves"
    :class="{ filling: level !== undefined }"
    :style="height ? { height } : undefined"
    aria-hidden="true"
  >
    <svg class="wave back" viewBox="0 0 200 40" preserveAspectRatio="none">
      <path :d="WAVE" />
    </svg>
    <svg class="wave front" viewBox="0 0 200 40" preserveAspectRatio="none">
      <path :d="WAVE" />
    </svg>
    <div v-if="level !== undefined" class="water" />
  </div>
</template>

<style scoped>
.waves {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: -1;
  height: 56px;
  pointer-events: none;
  color: currentcolor;
}
.filling {
  height: 0;
  min-height: 0;
  transition: height 0.25s linear;
}
.wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 200%;
  height: 40px;
  fill: currentcolor;
}
.filling .wave {
  bottom: calc(100% - 12px);
  height: 24px;
}
.back {
  opacity: 0.08;
  animation: roll 9s linear infinite;
}
.front {
  opacity: 0.12;
  animation: roll 6s linear infinite reverse;
}
.water {
  position: absolute;
  inset: 12px 0 0;
  background: currentcolor;
  opacity: 0.12;
}
@keyframes roll {
  to {
    transform: translateX(-50%);
  }
}
</style>
