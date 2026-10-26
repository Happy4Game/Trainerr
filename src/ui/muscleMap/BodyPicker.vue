<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MuscleId } from '@/domain/muscles';
import bodyPaths from './bodyPaths.json';
import { musclesAt, type BodyView } from './muscleSlugs';

/** Silhouette whose zones can be touched to pick muscles (search by body part). */
const props = defineProps<{ selected: readonly MuscleId[] }>();
const emit = defineEmits<{ pick: [muscles: MuscleId[]] }>();

const { t } = useI18n();
const views: BodyView[] = ['front', 'back'];

const zones = computed(() =>
  views.map((view) => ({
    view,
    viewBox: bodyPaths[view].viewBox,
    parts: bodyPaths[view].parts.map((part) => {
      const muscles = musclesAt(view, part.slug);
      return {
        slug: part.slug,
        paths: part.paths,
        muscles,
        selected: muscles.length > 0 && muscles.every((m) => props.selected.includes(m)),
        label: muscles.map((m) => t(`muscles.${m}`)).join(', '),
      };
    }),
  })),
);

function pick(muscles: MuscleId[], selected: boolean): void {
  emit('pick', selected ? [] : muscles);
}
</script>

<template>
  <div class="picker">
    <figure v-for="zone in zones" :key="zone.view" class="side">
      <svg :viewBox="zone.viewBox" class="body" role="group" :aria-label="t(`body.${zone.view}`)">
        <template v-for="part in zone.parts" :key="part.slug">
          <g
            v-if="part.muscles.length > 0"
            class="zone"
            :class="{ selected: part.selected }"
            role="button"
            tabindex="0"
            :aria-pressed="part.selected"
            :aria-label="part.label"
            @click="pick(part.muscles, part.selected)"
            @keydown.enter.prevent="pick(part.muscles, part.selected)"
            @keydown.space.prevent="pick(part.muscles, part.selected)"
          >
            <path v-for="(d, index) in part.paths" :key="index" :d="d" />
          </g>
          <g v-else class="inert" aria-hidden="true">
            <path v-for="(d, index) in part.paths" :key="index" :d="d" />
          </g>
        </template>
      </svg>
      <figcaption>{{ t(`body.${zone.view}`) }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.side {
  margin: 0;
  width: min(46%, 200px);
  text-align: center;
}
.body {
  width: 100%;
  height: auto;
}
.inert path {
  fill: var(--ion-color-light-shade);
}
.zone path {
  fill: var(--ion-color-medium-tint, #a9abb3);
  cursor: pointer;
  transition: fill 0.15s;
}
.zone:hover path,
.zone:focus-visible path {
  fill: rgba(var(--ion-color-primary-rgb), 0.55);
}
.zone:focus-visible {
  outline: none;
}
.zone.selected path {
  fill: var(--ion-color-primary);
}
figcaption {
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
}
</style>
