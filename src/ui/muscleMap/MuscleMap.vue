<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MuscleId } from '@/domain/muscles';
import bodyPaths from './bodyPaths.json';
import { highlightedParts, type BodyView } from './muscleSlugs';

const props = defineProps<{
  primary: readonly MuscleId[];
  secondary: readonly MuscleId[];
}>();

const { t } = useI18n();
const highlights = computed(() => highlightedParts(props.primary, props.secondary));
const views: BodyView[] = ['front', 'back'];
const label = computed(() =>
  t('exercise.muscles.map', {
    muscles: props.primary.map((m) => t(`muscles.${m}`)).join(', '),
  }),
);
</script>

<template>
  <div class="muscle-map" role="img" :aria-label="label">
    <svg
      v-for="view in views"
      :key="view"
      :viewBox="bodyPaths[view].viewBox"
      class="body"
      aria-hidden="true"
      focusable="false"
    >
      <g v-for="part in bodyPaths[view].parts" :key="part.slug">
        <path
          v-for="(d, index) in part.paths"
          :key="index"
          :d="d"
          :class="highlights.get(`${view}:${part.slug}`) ?? 'base'"
        />
      </g>
    </svg>
  </div>
  <!-- La couleur n'est jamais seule : la légende et la liste des muscles disent la même chose. -->
  <ul class="legend">
    <li><span class="swatch primary" aria-hidden="true" />{{ t('exercise.muscles.primary') }}</li>
    <li>
      <span class="swatch secondary" aria-hidden="true" />{{ t('exercise.muscles.secondary') }}
    </li>
  </ul>
</template>

<style scoped>
.muscle-map {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.body {
  width: min(45%, 180px);
  height: auto;
}
.base {
  fill: var(--ion-color-step-150, #d7d8da);
}
.primary {
  fill: var(--ion-color-primary);
}
.secondary {
  fill: var(--ion-color-primary);
  fill-opacity: 0.35;
}
.legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 0;
  margin-block: 8px 0;
  list-style: none;
  font-size: 0.9rem;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--ion-color-primary);
}
.swatch.secondary {
  opacity: 0.35;
}
</style>
