<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { mobilityRoutine } from '@/domain/mobility';
import type { MuscleId } from '@/domain/muscles';

const props = defineProps<{ muscles: readonly MuscleId[] }>();
const { t } = useI18n();

const routine = computed(() => mobilityRoutine(props.muscles));
const minutes = computed(() =>
  Math.round(routine.value.reduce((total, move) => total + move.seconds, 0) / 60),
);
</script>

<template>
  <details class="mobility">
    <summary>{{ t('mobility.title', { minutes }) }}</summary>
    <ol>
      <li v-for="move in routine" :key="move.id">
        <strong>{{ t(`mobility.moves.${move.id}.name`) }}</strong>
        · {{ t('mobility.seconds', { seconds: move.seconds }) }}
        <br />
        <span class="how">{{ t(`mobility.moves.${move.id}.how`) }}</span>
      </li>
    </ol>
    <p class="small">{{ t('mobility.review') }}</p>
  </details>
</template>

<style scoped>
.mobility {
  margin-block: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--ion-color-step-50, #f4f5f8);
}
summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  font-weight: 600;
  cursor: pointer;
}
li {
  margin-block: 6px;
}
.how,
.small {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
</style>
