<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue';
import { ArrowDown, ArrowUp, Minus, Plus, X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import type { CustomSession } from '@/data/repositories/settingsRepository';
import { newId } from '@/data/repositories/sessionRepository';
import ExercisePicker from '@/ui/ExercisePicker.vue';
import { orderIssues, recommendedOrder } from '@/domain/exerciseOrder';
import { adjustLine, DEFAULT_LINE, type SessionLine } from '@/domain/presets';
import type { CatalogExercise } from '@/data/catalog/catalog';
import { useSession } from '@/ui/session/useSession';
import { updateSettings, useSettings } from '@/ui/useSettings';

/** Creates ("new") or edits a session made by the user. */
const props = defineProps<{ id: string }>();

const { t, n, locale } = useI18n();
const { settings } = useSettings();
const session = useSession();
const router = useIonRouter();

const existing = computed(() =>
  props.id === 'new' ? undefined : settings.value?.customSessions?.find((c) => c.id === props.id),
);
const name = ref('');
const exerciseIds = ref<string[]>([]);
/** Own sets, reps and rests: a copied ready-made session has them, a new session does not. */
const lines = ref<Record<string, SessionLine> | undefined>();
const picking = ref(false);
const confirmingDelete = ref(false);
watch(
  existing,
  (custom) => {
    if (!custom) return;
    name.value = custom.name;
    exerciseIds.value = [...custom.exerciseIds];
    lines.value = custom.lines ? { ...custom.lines } : undefined;
  },
  { immediate: true },
);

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const thumbnailOf = (id: string) => {
  const image = illustrationFor(id)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
};
/** An isolation placed before the compound of its muscle: said, and fixable in one tap. */
const chosen = computed(() =>
  exerciseIds.value
    .map((id) => session.entryOf(id)?.exercise)
    .filter((e): e is CatalogExercise => e !== undefined),
);
const issues = computed(() => orderIssues(chosen.value));
function fixOrder(): void {
  exerciseIds.value = recommendedOrder(chosen.value).map((e) => e.id);
}
const canSave = computed(() => name.value.trim() !== '' && exerciseIds.value.length > 0);

function move(index: number, delta: number): void {
  const list = [...exerciseIds.value];
  const [item] = list.splice(index, 1);
  if (item === undefined) return;
  list.splice(index + delta, 0, item);
  exerciseIds.value = list;
}
function add(id: string): void {
  picking.value = false;
  if (!exerciseIds.value.includes(id)) exerciseIds.value = [...exerciseIds.value, id];
  if (lines.value && !lines.value[id]) lines.value = { ...lines.value, [id]: DEFAULT_LINE };
}

function adjust(id: string, change: 'sets' | 'reps' | 'rest', delta: 1 | -1): void {
  const line = lines.value?.[id];
  if (line) lines.value = { ...lines.value, [id]: adjustLine(line, change, delta) };
}
function repsText(line: SessionLine): string {
  const range =
    line.reps.min === line.reps.max
      ? n(line.reps.min)
      : t('presets.repsRange', { min: n(line.reps.min), max: n(line.reps.max) });
  return line.timed
    ? t('presets.seconds', { reps: range })
    : line.perSide
      ? t('presets.perSide', { reps: range })
      : range;
}
function restText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (m === 0) return t('presets.rest.seconds', { s: sec });
  return sec === 0
    ? t('presets.rest.minutes', { m })
    : t('presets.rest.minutesSeconds', { m, s: sec });
}

async function save(): Promise<void> {
  if (!canSave.value) return;
  const all = settings.value?.customSessions ?? [];
  const saved: CustomSession = {
    id: existing.value?.id ?? newId(),
    name: name.value.trim(),
    exerciseIds: exerciseIds.value,
    ...(lines.value
      ? {
          lines: Object.fromEntries(
            exerciseIds.value.flatMap((id) => {
              const line = lines.value?.[id];
              return line ? [[id, line]] : [];
            }),
          ),
        }
      : {}),
  };
  await updateSettings({
    customSessions: existing.value
      ? all.map((c) => (c.id === saved.id ? saved : c))
      : [...all, saved],
  });
  router.navigate('/tabs/session', 'back', 'pop');
}

async function remove(): Promise<void> {
  await updateSettings({
    customSessions: (settings.value?.customSessions ?? []).filter((c) => c.id !== props.id),
  });
  router.navigate('/tabs/session', 'back', 'pop');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/session" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{
          existing ? t('customSession.editTitle') : t('customSession.newTitle')
        }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-input
        v-model="name"
        fill="outline"
        :label="t('customSession.name')"
        label-placement="stacked"
        :placeholder="t('customSession.namePlaceholder')"
        :maxlength="40"
      />

      <h2 class="section">{{ t('customSession.exercises', exerciseIds.length) }}</h2>
      <p v-if="exerciseIds.length === 0" class="empty">{{ t('customSession.empty') }}</p>
      <ol class="list">
        <li v-for="(exerciseId, index) in exerciseIds" :key="exerciseId" class="row">
          <span class="number" aria-hidden="true">{{ index + 1 }}</span>
          <span class="thumb" aria-hidden="true">
            <img v-if="thumbnailOf(exerciseId)" :src="thumbnailOf(exerciseId)" alt="" />
          </span>
          <span class="name">
            {{ nameOf(exerciseId) }}
            <span v-if="lines?.[exerciseId]" class="line-summary">
              {{
                t('presets.line', {
                  sets: lines[exerciseId]!.sets,
                  reps: repsText(lines[exerciseId]!),
                  rest: restText(lines[exerciseId]!.restSeconds),
                })
              }}
            </span>
          </span>
          <span class="actions">
            <ion-button fill="clear" size="small" :disabled="index === 0" @click="move(index, -1)">
              <ArrowUp :size="18" aria-hidden="true" />
              <span class="visually-hidden">{{
                t('customSession.up', { name: nameOf(exerciseId) })
              }}</span>
            </ion-button>
            <ion-button
              fill="clear"
              size="small"
              :disabled="index === exerciseIds.length - 1"
              @click="move(index, 1)"
            >
              <ArrowDown :size="18" aria-hidden="true" />
              <span class="visually-hidden">{{
                t('customSession.down', { name: nameOf(exerciseId) })
              }}</span>
            </ion-button>
            <ion-button
              fill="clear"
              size="small"
              color="danger"
              @click="exerciseIds = exerciseIds.filter((e) => e !== exerciseId)"
            >
              <X :size="18" aria-hidden="true" />
              <span class="visually-hidden">{{
                t('customSession.remove', { name: nameOf(exerciseId) })
              }}</span>
            </ion-button>
          </span>
          <div
            v-if="lines?.[exerciseId]"
            class="line-editor"
            role="group"
            :aria-label="t('customSession.lineOf', { name: nameOf(exerciseId) })"
          >
            <div v-for="change in ['sets', 'reps', 'rest'] as const" :key="change" class="adjust">
              <span class="adjust-label">{{ t(`customSession.adjust.${change}`) }}</span>
              <ion-button
                fill="outline"
                size="small"
                :aria-label="t(`customSession.adjust.${change}Less`, { name: nameOf(exerciseId) })"
                @click="adjust(exerciseId, change, -1)"
              >
                <Minus :size="16" aria-hidden="true" />
              </ion-button>
              <ion-button
                fill="outline"
                size="small"
                :aria-label="t(`customSession.adjust.${change}More`, { name: nameOf(exerciseId) })"
                @click="adjust(exerciseId, change, 1)"
              >
                <Plus :size="16" aria-hidden="true" />
              </ion-button>
            </div>
          </div>
        </li>
      </ol>
      <div v-if="issues.length > 0" class="order-warning" role="note">
        <p v-for="issue in issues" :key="issue.isolationId">
          {{
            t('customSession.orderIssue', {
              isolation: nameOf(issue.isolationId),
              compound: nameOf(issue.compoundId),
              muscle: t(`muscles.${issue.muscle}`),
            })
          }}
        </p>
        <ion-button size="small" @click="fixOrder">{{ t('customSession.fixOrder') }}</ion-button>
        <router-link to="/tabs/session/presets">{{ t('presets.principle.title') }}</router-link>
      </div>
      <ion-button expand="block" fill="outline" @click="picking = true">
        <Plus :size="20" aria-hidden="true" /> {{ t('customSession.add') }}
      </ion-button>

      <ion-button expand="block" size="large" class="save" :disabled="!canSave" @click="save">
        {{ t('customSession.save') }}
      </ion-button>
      <template v-if="existing">
        <ion-button
          v-if="!confirmingDelete"
          expand="block"
          fill="clear"
          color="danger"
          @click="confirmingDelete = true"
        >
          {{ t('customSession.delete') }}
        </ion-button>
        <div v-else class="confirm" role="alertdialog" :aria-label="t('customSession.delete')">
          <p>{{ t('customSession.deleteConfirm') }}</p>
          <ion-button expand="block" color="danger" @click="remove">
            {{ t('customSession.deleteYes') }}
          </ion-button>
        </div>
      </template>

      <ExercisePicker
        :open="picking"
        :title="t('customSession.add')"
        :exclude="exerciseIds"
        @pick="add"
        @close="picking = false"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.order-warning {
  margin-block: 8px;
  padding: 10px 12px;
  border-radius: var(--app-radius-small);
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.order-warning p {
  margin: 0 0 6px;
}
.order-warning a {
  margin-inline-start: 8px;
  color: inherit;
}
.section {
  margin-block: 20px 8px;
  font-size: 1.1rem;
  font-weight: 700;
}
.empty {
  color: var(--ion-color-medium-shade);
}
.list {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 6px 4px 6px 12px;
}
.row + .row {
  border-block-start: 1px solid var(--ion-color-light);
}
.number {
  width: 1.4em;
  font-weight: 700;
  color: var(--ion-color-primary);
}
.thumb {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}
.actions {
  display: flex;
  flex: none;
}
.line-summary {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--tr-text-muted);
}
.line-editor {
  display: flex;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding-inline-start: calc(1.4em + 10px);
}
.adjust {
  display: flex;
  align-items: center;
  gap: 2px;
}
.adjust-label {
  margin-inline-end: 4px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tr-text-muted);
}
.adjust ion-button {
  margin: 0;
  min-width: 44px;
  min-height: 44px;
}
.actions ion-button {
  margin: 0;
  --padding-start: 6px;
  --padding-end: 6px;
}
.save {
  margin-block-start: 20px;
}
.confirm {
  padding: 12px;
  border: 1px solid var(--ion-color-danger);
  border-radius: var(--app-radius-small);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
