<script setup lang="ts">
import { Activity, Bike, Footprints, Mountain, Waves } from 'lucide-vue-next';
import type { CardioIcon } from '@/domain/cardio';

/** Icon of a cardio machine (Lucide, ISC licence). */
defineProps<{ icon: CardioIcon; size?: number }>();

const ICONS = {
  activity: Activity,
  bike: Bike,
  footprints: Footprints,
  mountain: Mountain,
  waves: Waves,
};
</script>

<template>
  <component :is="ICONS[icon]" :size="size ?? 24" aria-hidden="true" />
</template>
