<script setup lang="ts">
import { useSettings } from '@/ui/useSettings';
import { decorationsOn } from './celebrate';
import MascotFigure from './MascotFigure.vue';

/**
 * The mascot, small, next to a speech bubble: a tip, an encouragement. The
 * bubble pops each time its text changes. With the decorations off, only the
 * bubble's content stays, as a plain note.
 */
defineProps<{ message: string }>();
const { settings } = useSettings();
</script>

<template>
  <div class="says" :class="{ plain: !decorationsOn(settings) }" role="note">
    <MascotFigure v-if="decorationsOn(settings)" pose="wave" class="mascot" />
    <div :key="message" class="bubble">
      <p class="message">{{ message }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.says {
  display: flex;
  align-items: flex-end;
  gap: var(--tr-space-2);
  margin-block: var(--tr-space-3);
}
.mascot {
  flex: none;
  width: 56px;
}
.bubble {
  position: relative;
  flex: 1;
  min-width: 0;
  margin-block-end: var(--tr-space-5);
  padding: var(--tr-space-3) var(--tr-space-4);
  border-radius: var(--tr-radius-m) var(--tr-radius-m) var(--tr-radius-m) 4px;
  background: var(--tr-surface-2);
  color: var(--tr-text);
  animation: tr-pop var(--tr-duration-slow) var(--tr-ease-spring);
  transform-origin: 0 100%;
}
/* The tail points at the mascot. */
.bubble::before {
  content: '';
  position: absolute;
  left: -8px;
  bottom: 0;
  border: 8px solid transparent;
  border-bottom-color: var(--tr-surface-2);
  border-right-color: var(--tr-surface-2);
}
.plain .bubble {
  margin-block-end: 0;
  border-radius: var(--tr-radius-m);
}
.plain .bubble::before {
  display: none;
}
.message {
  margin: 0;
  font-weight: 600;
}
</style>
