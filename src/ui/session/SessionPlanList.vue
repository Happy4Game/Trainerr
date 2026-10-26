<script setup lang="ts">
import { Link2 } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SessionBlock } from '@/domain/supersets';
import type { Exercise } from '@/domain/types';
import ExerciseRow from '@/ui/ExerciseRow.vue';
import { useSession } from '@/ui/session/useSession';

/**
 * The exercises of a session before it starts. With supersets on, the pairs
 * are shown together, in the order they will be done.
 */
const props = defineProps<{
  exercises: readonly Exercise[];
  supersets: boolean;
  name: (e: Exercise) => string;
  detail: (id: string) => string;
  to: (id: string) => string;
  badge?: (id: string) => string | undefined;
}>();

const { t } = useI18n();
const session = useSession();

const blocks = computed<SessionBlock[]>(() =>
  props.supersets
    ? session.supersetBlocks(props.exercises)
    : props.exercises.map((exercise) => ({ kind: 'single', exercise })),
);
const noPair = computed(() => props.supersets && blocks.value.every((b) => b.kind === 'single'));
</script>

<template>
  <ol class="plan">
    <template
      v-for="block in blocks"
      :key="block.kind === 'single' ? block.exercise.id : block.first.id"
    >
      <li v-if="block.kind === 'single'">
        <ExerciseRow
          :exercise-id="block.exercise.id"
          :name="name(block.exercise)"
          :detail="detail(block.exercise.id)"
          :to="to(block.exercise.id)"
        >
          <template v-if="badge?.(block.exercise.id)" #badge>
            <span class="tag">{{ badge(block.exercise.id) }}</span>
          </template>
        </ExerciseRow>
      </li>
      <li v-else class="pair">
        <div
          role="group"
          :aria-label="
            t('session.supersetGroup', { first: name(block.first), second: name(block.second) })
          "
        >
          <p class="pair-title">
            <Link2 :size="16" aria-hidden="true" />
            {{ t('session.supersetTitle') }}
            <span class="pair-help">{{ t('session.supersetRest') }}</span>
          </p>
          <ExerciseRow
            v-for="e in [block.first, block.second]"
            :key="e.id"
            :exercise-id="e.id"
            :name="name(e)"
            :detail="detail(e.id)"
            :to="to(e.id)"
          >
            <template v-if="badge?.(e.id)" #badge>
              <span class="tag">{{ badge(e.id) }}</span>
            </template>
          </ExerciseRow>
        </div>
      </li>
    </template>
  </ol>
  <p v-if="noPair" class="no-pair" role="note">{{ t('session.supersetNone') }}</p>
</template>

<style scoped>
.plan {
  margin: 8px 0 12px;
  padding: 0;
  list-style: none;
}
.plan li + li {
  border-block-start: 1px solid var(--ion-color-light);
}
/* A pair: framed together, in the action colour. */
.pair {
  margin-block: 8px;
  padding: 4px 8px 4px 10px;
  border: 0 !important;
  border-inline-start: 4px solid var(--ion-color-primary) !important;
  border-radius: var(--app-radius-small);
  background: rgba(var(--ion-color-primary-rgb), 0.07);
}
.pair-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin: 6px 0 0;
  color: var(--ion-color-primary);
  font-size: 0.85rem;
  font-weight: 800;
}
.pair-help {
  color: var(--ion-color-medium-shade);
  font-weight: 500;
}
.tag {
  margin-inline-end: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-size: 0.75rem;
}
.no-pair {
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: var(--app-radius-small);
  background: var(--ion-color-light);
  font-size: 0.9rem;
}
</style>
