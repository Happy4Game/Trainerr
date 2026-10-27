<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Exercise } from '@/domain/types';
import LoadNoteModal from '@/ui/LoadNoteModal.vue';
import { useSettings } from '@/ui/useSettings';
import { useSession } from './useSession';

/**
 * Someone who already trains, on machines the app has never seen them use:
 * noting the usual load beats a light test set on each one. Shown on Today
 * (right after the questionnaire) and on Session.
 */
const props = defineProps<{ exercises: readonly Exercise[]; onHero?: boolean }>();

const { t, locale } = useI18n();
const session = useSession();
const { settings } = useSettings();

const unknown = computed(() =>
  settings.value?.level === 'beginner'
    ? []
    : props.exercises.filter((e) => !session.myLoadFor(e.id)),
);
const nameOf = (e: Exercise) => {
  const entry = session.entryOf(e.id)?.exercise;
  return entry ? (locale.value.startsWith('fr') ? entry.name : entry.nameEn) : e.id;
};
const noting = ref<{ id: string; name: string }>();
</script>

<template>
  <div v-if="unknown.length > 0" class="usual-loads" :class="{ hero: onHero }" role="note">
    <p>{{ t('session.usualLoads.intro', unknown.length) }}</p>
    <ion-button
      v-for="e in unknown"
      :key="e.id"
      size="small"
      :fill="onHero ? 'solid' : 'outline'"
      v-bind="onHero ? { color: 'light' } : {}"
      :aria-label="t('myLoad.add', { name: nameOf(e) })"
      @click="noting = { id: e.id, name: nameOf(e) }"
    >
      {{ t('session.usualLoads.add', { name: nameOf(e) }) }}
    </ion-button>
  </div>
  <LoadNoteModal :exercise-id="noting?.id" :name="noting?.name ?? ''" @close="noting = undefined" />
</template>

<style scoped>
.usual-loads {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-start: var(--tr-space-3);
  padding: var(--tr-space-3);
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface-2);
}
.usual-loads.hero {
  margin-block: 0 var(--tr-space-3);
  background: rgb(255 255 255 / 14%);
}
.usual-loads p {
  flex-basis: 100%;
  margin: 0 0 4px;
  color: var(--tr-text-muted);
  font-size: 0.9rem;
}
.usual-loads.hero p {
  color: inherit;
  opacity: 0.9;
}
.usual-loads ion-button {
  --border-radius: var(--tr-radius-pill);
  margin: 0;
  text-transform: none;
}
</style>
