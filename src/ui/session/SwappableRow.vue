<script setup lang="ts">
import { ArrowLeftRight } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ExerciseRow from '@/ui/ExerciseRow.vue';
import { useSession } from './useSession';

/**
 * A machine of the proposed session, with the ⇄ button of Today: very close
 * machines to take instead, kept for the next sessions until undone.
 */
const props = defineProps<{
  exerciseId: string;
  name: string;
  detail: string;
  to: string;
  swappable?: boolean;
}>();

const { t, locale } = useI18n();
const session = useSession();
const open = ref(false);

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const choices = computed(() => (props.swappable ? session.replacements(props.exerciseId) : []));
const original = computed(() =>
  props.swappable ? session.swappedFrom(props.exerciseId) : undefined,
);

async function swap(toId: string): Promise<void> {
  open.value = false;
  await session.swapPlanned(props.exerciseId, toId);
}
</script>

<template>
  <div class="swappable">
    <ExerciseRow class="exercise" :exercise-id="exerciseId" :name="name" :detail="detail" :to="to">
      <template #badge><slot name="badge" /></template>
    </ExerciseRow>
    <button
      v-if="choices.length > 0"
      type="button"
      class="swap-open"
      :aria-expanded="open"
      :aria-label="t('today.swap.openNamed', { name })"
      @click="open = !open"
    >
      <ArrowLeftRight :size="18" aria-hidden="true" />
    </button>
    <p v-if="original" class="instead">
      {{ t('today.swap.insteadOf', { name: nameOf(original) }) }}
      ·
      <button
        type="button"
        class="link"
        :aria-label="t('today.swap.undoNamed', { name: nameOf(original) })"
        @click="session.unswap(exerciseId)"
      >
        {{ t('today.swap.undo') }}
      </button>
    </p>
    <div
      v-if="open"
      class="swap-choices"
      role="group"
      :aria-label="t('today.swap.title', { name })"
    >
      <span class="swap-title">{{ t('today.swap.title', { name }) }}</span>
      <button
        v-for="alt in choices"
        :key="alt.id"
        type="button"
        class="swap-choice"
        @click="swap(alt.id)"
      >
        {{ nameOf(alt.id) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.swappable {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 8px;
}
.exercise {
  flex: 1;
  min-width: 0;
}
.swap-open {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--tr-radius-pill);
  background: var(--tr-surface-2);
  color: var(--ion-color-primary);
}
.instead {
  flex-basis: 100%;
  margin: 0 0 6px;
  color: var(--tr-text-muted);
  font-size: 0.85rem;
}
.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ion-color-primary);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
}
.swap-choices {
  display: flex;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: 6px;
  padding-block: 4px 8px;
}
.swap-title {
  flex-basis: 100%;
  color: var(--tr-text-muted);
  font-size: 0.85rem;
}
.swap-choice {
  min-height: 44px;
  padding: 6px 12px;
  border: 0;
  border-radius: var(--tr-radius-pill);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
}
</style>
