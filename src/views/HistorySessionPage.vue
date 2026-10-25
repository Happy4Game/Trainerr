<script setup lang="ts">
import { useTemplateName } from '@/ui/useTemplateName';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  addSet,
  deleteSession,
  deleteSet,
  setSessionDate,
  setSessionNote,
  updateSet,
  type StoredSet,
} from '@/data/repositories/sessionRepository';
import type { Difficulty } from '@/domain/types';
import ExercisePicker from '@/ui/ExercisePicker.vue';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';

const props = defineProps<{ id: string }>();
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'ok', 'hard', 'fail'];

const { t, locale } = useI18n();
const templateLabel = useTemplateName();
const session = useSession();
const { symbol, toDisplay, fromInput } = useUnits();
const router = useIonRouter();

const past = computed(() => session.history.value.find((s) => s.id === props.id));
const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};

/** Sets grouped by exercise, in the order they were done. */
const groups = computed(() => {
  const byExercise = new Map<string, StoredSet[]>();
  for (const set of (past.value?.sets ?? []) as StoredSet[]) {
    byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
  }
  return [...byExercise.entries()].map(([exerciseId, sets]) => ({ exerciseId, sets }));
});

const picking = ref(false);
const confirmingDelete = ref(false);

const number = (value: unknown) => Number(String(value ?? '').replace(',', '.'));

async function change(
  set: StoredSet,
  values: Partial<Pick<StoredSet, 'loadKg' | 'reps' | 'difficulty'>>,
) {
  const next = { loadKg: set.loadKg, reps: set.reps, difficulty: set.difficulty, ...values };
  if (!(next.loadKg >= 0) || !(next.reps > 0)) return;
  await session.editHistory((db) => updateSet(db, set.id, next));
}

async function addOneMore(exerciseId: string, last: StoredSet | undefined) {
  await session.editHistory((db) =>
    addSet(db, props.id, {
      exerciseId,
      loadKg: last?.loadKg ?? 0,
      reps: last?.reps ?? 10,
      difficulty: last?.difficulty ?? 'ok',
    }),
  );
}

/** Starts from the last set done on this exercise, anywhere in the history. */
async function addExercise(exerciseId: string) {
  picking.value = false;
  const last = session.history.value
    .flatMap((s) => s.sets)
    .filter((s) => s.exerciseId === exerciseId && !s.warmup)
    .at(-1) as StoredSet | undefined;
  await addOneMore(exerciseId, last);
}

async function remove() {
  await session.editHistory((db) => deleteSession(db, props.id));
  router.navigate('/tabs/history', 'back', 'pop');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/history" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ t('historyEdit.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="!past" role="status">{{ t('historyEdit.notFound') }}</p>
      <template v-else>
        <h1 class="title">{{ templateLabel(past.templateId) }}</h1>
        <ion-input
          type="date"
          fill="outline"
          :label="t('historyEdit.date')"
          label-placement="stacked"
          :value="past.date"
          @ion-change="
            $event.detail.value &&
            session.editHistory((db) => setSessionDate(db, past!.id, String($event.detail.value)))
          "
        />

        <ion-card v-for="group in groups" :key="group.exerciseId">
          <ion-card-header>
            <ion-card-title>{{ nameOf(group.exerciseId) }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div
              v-for="(set, index) in group.sets"
              :key="set.id"
              class="set"
              role="group"
              :aria-label="
                t('historyEdit.set', { number: index + 1, name: nameOf(group.exerciseId) })
              "
            >
              <span class="number">{{ set.warmup ? t('session.warmupShort') : index + 1 }}</span>
              <ion-input
                type="number"
                inputmode="decimal"
                fill="outline"
                class="load"
                :label="symbol"
                label-placement="stacked"
                :value="toDisplay(set.loadKg)"
                @ion-change="change(set, { loadKg: fromInput(number($event.detail.value)) })"
              />
              <ion-input
                type="number"
                inputmode="decimal"
                fill="outline"
                class="reps"
                :label="t('historyEdit.reps')"
                label-placement="stacked"
                :value="set.reps"
                @ion-change="change(set, { reps: number($event.detail.value) })"
              />
              <ion-select
                fill="outline"
                class="feeling"
                :label="t('historyEdit.difficulty')"
                label-placement="stacked"
                interface="popover"
                :value="set.difficulty"
                @ion-change="change(set, { difficulty: $event.detail.value })"
              >
                <ion-select-option v-for="d in DIFFICULTIES" :key="d" :value="d">
                  {{ t(`difficulty.${d}`) }}
                </ion-select-option>
              </ion-select>
              <ion-button
                fill="clear"
                color="danger"
                class="delete"
                :aria-label="t('historyEdit.deleteSet')"
                @click="session.editHistory((db) => deleteSet(db, set.id))"
              >
                <Trash2 :size="20" aria-hidden="true" />
              </ion-button>
            </div>
            <ion-button
              fill="clear"
              size="small"
              @click="addOneMore(group.exerciseId, group.sets.at(-1))"
            >
              <Plus :size="18" aria-hidden="true" /> {{ t('historyEdit.addSet') }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-button expand="block" fill="outline" @click="picking = true">
          <Plus :size="20" aria-hidden="true" /> {{ t('historyEdit.addExercise') }}
        </ion-button>

        <ion-textarea
          class="ion-margin-top"
          fill="outline"
          :label="t('session.note')"
          label-placement="stacked"
          :value="past.note ?? ''"
          auto-grow
          :debounce="500"
          @ion-input="
            session.editHistory((db) =>
              setSessionNote(db, past!.id, String($event.detail.value ?? '')),
            )
          "
        />

        <ion-button
          v-if="!confirmingDelete"
          class="ion-margin-top"
          expand="block"
          fill="clear"
          color="danger"
          @click="confirmingDelete = true"
        >
          {{ t('historyEdit.deleteSession') }}
        </ion-button>
        <div v-else class="confirm" role="alertdialog" :aria-label="t('historyEdit.deleteSession')">
          <p>{{ t('historyEdit.deleteConfirm') }}</p>
          <ion-button expand="block" color="danger" @click="remove">
            {{ t('historyEdit.deleteYes') }}
          </ion-button>
          <ion-button expand="block" fill="clear" @click="confirmingDelete = false">
            {{ t('data.cancel') }}
          </ion-button>
        </div>

        <ExercisePicker
          :open="picking"
          :title="t('historyEdit.addExercise')"
          :exclude="groups.map((g) => g.exerciseId)"
          @pick="addExercise"
          @close="picking = false"
        />
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.title {
  font-size: 1.4rem;
}
.set {
  display: grid;
  grid-template-columns: 1.5rem 1fr 1fr 44px;
  grid-template-areas:
    'number load reps delete'
    '. feeling feeling .';
  gap: 6px;
  align-items: center;
  margin-block: 10px;
  padding-block-end: 10px;
  border-block-end: 1px solid var(--ion-color-light);
}
.set .load {
  grid-area: load;
}
.set .reps {
  grid-area: reps;
}
.set .feeling {
  grid-area: feeling;
}
.set .delete {
  grid-area: delete;
}
.number {
  grid-area: number;
  text-align: center;
  color: var(--ion-color-medium);
}
.confirm {
  margin-block-start: 16px;
  padding: 12px;
  border: 1px solid var(--ion-color-danger);
  border-radius: 12px;
}
</style>
