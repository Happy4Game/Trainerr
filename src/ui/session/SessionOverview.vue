<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Check } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { useUnits } from '@/ui/useUnits';
import { useSession } from './useSession';

/** The whole session at a glance: done, current and next machines, with a quick reorder. */
defineProps<{
  open: boolean;
  exercises: readonly { id: string; name: string; status: 'done' | 'current' | 'next' }[];
}>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const session = useSession();
const { load: kg } = useUnits();

const thumbnailOf = (id: string) => {
  const image = illustrationFor(id)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
};
const setsLine = (id: string) =>
  t('session.overview.sets', {
    done: session.workSetsInSession(id).length,
    total: session.plannedSets(id),
  });

async function doNow(id: string): Promise<void> {
  await session.addExerciseNow(id);
  emit('close');
}
</script>

<template>
  <ion-modal
    :is-open="open"
    :initial-breakpoint="0.85"
    :breakpoints="[0, 0.85, 1]"
    @did-dismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('session.overview.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ t('session.plates.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ol class="overview">
        <li
          v-for="(e, index) in exercises"
          :key="e.id"
          class="item"
          :class="e.status"
          :aria-current="e.status === 'current' ? 'step' : undefined"
        >
          <span class="step" aria-hidden="true">
            <Check v-if="e.status === 'done'" :size="18" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="thumb" aria-hidden="true">
            <img v-if="thumbnailOf(e.id)" :src="thumbnailOf(e.id)" alt="" />
          </span>
          <span class="text">
            <span class="name">{{ e.name }}</span>
            <span class="detail">
              <span class="status">{{ t(`session.progress.status.${e.status}`) }}</span>
              · {{ setsLine(e.id) }}
              <template v-if="e.status === 'next' && session.proposalFor(e.id)">
                · {{ kg(session.proposalFor(e.id)?.loadKg ?? 0) }}
              </template>
            </span>
          </span>
          <ion-button
            v-if="e.status !== 'current'"
            size="small"
            fill="outline"
            :aria-label="
              t(
                e.status === 'next' ? 'session.overview.nowNamed' : 'session.overview.reopenNamed',
                {
                  name: e.name,
                },
              )
            "
            @click="doNow(e.id)"
          >
            {{ t(e.status === 'next' ? 'session.overview.nowShort' : 'session.overview.reopen') }}
          </ion-button>
        </li>
      </ol>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.overview {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-block-end: 8px;
  padding: 10px;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.item.current {
  outline: 2px solid var(--ion-color-primary);
}
.item.done {
  opacity: 0.75;
}
.step {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-weight: 700;
  font-size: 0.9rem;
}
.done .step {
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
}
.current .step {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.thumb {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-weight: 700;
}
.detail {
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}
.current .status {
  color: var(--ion-color-primary);
  font-weight: 700;
}
</style>
