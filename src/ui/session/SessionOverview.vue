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
import { ArrowDown, ArrowUp, Check, Minus, Plus, X } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import ExercisePicker from '@/ui/ExercisePicker.vue';
import { useLoadLabel } from './useLoadLabel';
import { useSession } from './useSession';

/** The whole session at a glance: done, current and next machines, with a quick reorder. */
const props = defineProps<{
  open: boolean;
  exercises: readonly { id: string; name: string; status: 'done' | 'current' | 'next' }[];
}>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const session = useSession();
const loadOf = useLoadLabel();

const thumbnailOf = (id: string) => {
  const image = illustrationFor(id)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
};
const cardLink = (id: string) => `/tabs/session/exercise/${encodeURIComponent(id)}`;
const setsLine = (id: string) =>
  t('session.overview.sets', {
    done: session.workSetsInSession(id).length,
    total: session.plannedSets(id),
  });

const pending = () => session.active.value?.plan.queue.pending ?? [];
const canMove = (id: string, delta: -1 | 1) => {
  const index = pending().indexOf(id);
  // The first one is the current exercise: the others move around it.
  return index > 0 && index + delta > 0 && index + delta < pending().length;
};

async function doNow(id: string): Promise<void> {
  await session.addExerciseNow(id);
  emit('close');
}

/** Another exercise, at the end of the session: it shows up in the list, ready to move. */
const picking = ref(false);
async function addLater(id: string): Promise<void> {
  picking.value = false;
  await session.addExerciseLater(id);
}
const inSession = () => props.exercises.filter((e) => e.status !== 'done').map((e) => e.id);
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
      <!-- At the top: the sheet stops at 85 % of the screen, the end of the list is below it. -->
      <ion-button expand="block" fill="outline" class="add" @click="picking = true">
        {{ t('session.addExercise') }}
      </ion-button>
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
          <router-link
            :to="cardLink(e.id)"
            class="thumb"
            :aria-label="t('session.seeMovementOf', { name: e.name })"
            @click="emit('close')"
          >
            <img v-if="thumbnailOf(e.id)" :src="thumbnailOf(e.id)" alt="" />
          </router-link>
          <span class="text">
            <span class="name">{{ e.name }}</span>
            <span class="detail">
              <span class="status">{{ t(`session.progress.status.${e.status}`) }}</span>
              · {{ setsLine(e.id) }}
              <template v-if="e.status === 'next' && session.proposalFor(e.id)">
                · {{ loadOf(e.id, session.proposalFor(e.id)?.loadKg ?? 0) }}
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
          <span v-if="e.status !== 'done'" class="edit">
            <ion-button
              size="small"
              fill="clear"
              :disabled="!session.canRemoveSet(e.id)"
              @click="session.removePlannedSet(e.id)"
            >
              <Minus :size="18" aria-hidden="true" />
              <span class="visually-hidden">{{
                t('session.overview.fewerSets', { name: e.name })
              }}</span>
            </ion-button>
            <ion-button
              size="small"
              fill="clear"
              :disabled="!session.canAddSet(e.id)"
              @click="session.extraSet(e.id)"
            >
              <Plus :size="18" aria-hidden="true" />
              <span class="visually-hidden">{{
                t('session.overview.moreSets', { name: e.name })
              }}</span>
            </ion-button>
            <template v-if="e.status === 'next'">
              <ion-button
                size="small"
                fill="clear"
                :disabled="!canMove(e.id, -1)"
                @click="session.moveExercise(e.id, -1)"
              >
                <ArrowUp :size="18" aria-hidden="true" />
                <span class="visually-hidden">{{
                  t('session.overview.earlier', { name: e.name })
                }}</span>
              </ion-button>
              <ion-button
                size="small"
                fill="clear"
                :disabled="!canMove(e.id, 1)"
                @click="session.moveExercise(e.id, 1)"
              >
                <ArrowDown :size="18" aria-hidden="true" />
                <span class="visually-hidden">{{
                  t('session.overview.later', { name: e.name })
                }}</span>
              </ion-button>
              <ion-button
                size="small"
                fill="clear"
                color="danger"
                @click="session.removeExercise(e.id)"
              >
                <X :size="18" aria-hidden="true" />
                <span class="visually-hidden">{{
                  t('session.overview.remove', { name: e.name })
                }}</span>
              </ion-button>
            </template>
          </span>
        </li>
      </ol>
      <ExercisePicker
        :open="picking"
        :title="t('session.addExercise')"
        :exclude="inSession()"
        :focus="session.sessionMuscles.value"
        @pick="addLater"
        @close="picking = false"
      />
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.add {
  margin-block-end: 12px;
}
.overview {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  flex-wrap: wrap;
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
.edit {
  display: flex;
  flex-basis: 100%;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.edit ion-button {
  min-width: 44px;
  min-height: 44px;
  margin: 0;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
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
