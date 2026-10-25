<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Star } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MuscleId } from '@/domain/muscles';
import { repRangeFor } from '@/domain/progression';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import ExerciseIllustration from '@/ui/ExerciseIllustration.vue';
import ComebackCard from '@/ui/ComebackCard.vue';
import ExerciseProgress from '@/ui/ExerciseProgress.vue';
import { readPhoto } from '@/ui/photo';
import LoadStepsEditor from '@/ui/LoadStepsEditor.vue';
import { useSettings } from '@/ui/useSettings';
import { defaultStepsFor } from '@/domain/loadSteps';
import MuscleMap from '@/ui/muscleMap/MuscleMap.vue';
import { useCatalog } from '@/ui/useCatalog';

const props = defineProps<{ id: string }>();

const { t, locale } = useI18n();
const {
  state,
  entry: entryOf,
  toggleFavorite,
  saveLoadSteps,
  saveNote,
  savePlatePhoto,
} = useCatalog();
async function onPhoto(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) await savePlatePhoto(props.id, await readPhoto(file));
}
const entry = entryOf(props.id);
const exercise = computed(() => entry.value?.exercise);

const french = computed(() => locale.value.startsWith('fr'));
const title = computed(() => (french.value ? exercise.value?.name : exercise.value?.nameEn) ?? '');
const otherName = computed(() => {
  const e = exercise.value;
  if (!e) return undefined;
  const names = [e.machineName, french.value ? e.nameEn : e.name].filter(
    (name): name is string => !!name && name !== title.value,
  );
  return [...new Set(names)].join(' · ') || undefined;
});
const { settings } = useSettings();
const stepsForComeback = computed(() =>
  entry.value && entry.value.loadSteps.length > 0
    ? entry.value.loadSteps
    : exercise.value
      ? defaultStepsFor(exercise.value.equipment)
      : [],
);
const cuesFor = (cues: { fr: readonly string[]; en?: readonly string[] }) =>
  french.value ? cues.fr : (cues.en ?? cues.fr);
const illustration = computed(() => illustrationFor(props.id));
const range = computed(() => (exercise.value ? repRangeFor(exercise.value) : undefined));

const stepsSaved = ref(false);
async function onStepsChange(id: string, steps: number[]): Promise<void> {
  stepsSaved.value = false;
  await saveLoadSteps(id, steps);
  stepsSaved.value = true;
}
const muscleList = (muscles: readonly MuscleId[]) =>
  muscles.length > 0
    ? muscles.map((m) => t(`muscles.${m}`)).join(', ')
    : t('exercise.muscles.none');
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/catalog" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p v-if="state.kind !== 'ready'" role="status">{{ t('catalog.loading') }}</p>
      <p v-else-if="!entry || !exercise" role="alert">{{ t('exercise.notFound') }}</p>
      <template v-else>
        <h1 class="name">{{ title }}</h1>
        <p v-if="otherName" class="other-name">{{ otherName }}</p>
        <p v-if="exercise.aliases.length > 0" class="other-name">
          {{ exercise.aliases.join(', ') }}
        </p>

        <ion-button
          expand="block"
          :fill="entry.favorite ? 'solid' : 'outline'"
          :aria-pressed="entry.favorite"
          @click="toggleFavorite(exercise.id)"
        >
          <Star
            :size="20"
            :fill="entry.favorite ? 'currentColor' : 'none'"
            aria-hidden="true"
            class="icon"
          />
          {{ t(entry.favorite ? 'exercise.favorite.remove' : 'exercise.favorite.add') }}
        </ion-button>

        <ExerciseIllustration
          v-if="illustration"
          :illustration="illustration"
          :name="title"
          class="ion-margin-top"
        />

        <div class="chips">
          <ion-chip>{{ t(`groups.${exercise.group}`) }}</ion-chip>
          <ion-chip>{{ t(`kinds.${exercise.kind}`) }}</ion-chip>
          <ion-chip v-if="range">{{
            t('exercise.repRange', { min: range.min, max: range.max })
          }}</ion-chip>
          <ion-chip>{{ t(`equipment.${exercise.equipment}`) }}</ion-chip>
        </div>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ t('exercise.muscles.title') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <MuscleMap :primary="exercise.primaryMuscles" :secondary="exercise.secondaryMuscles" />
            <p>
              <strong>{{ t('exercise.muscles.primary') }} :</strong>
              {{ muscleList(exercise.primaryMuscles) }}
            </p>
            <p>
              <strong>{{ t('exercise.muscles.secondary') }} :</strong>
              {{ muscleList(exercise.secondaryMuscles) }}
            </p>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ t('exercise.cues.title') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <template v-if="exercise.cues">
              <ul>
                <li v-for="cue in cuesFor(exercise.cues)" :key="cue">{{ cue }}</li>
              </ul>
              <p class="small">{{ t('exercise.cues.source', { source: exercise.cues.source }) }}</p>
              <p class="small">{{ t('exercise.cues.review') }}</p>
            </template>
            <template v-else>
              <ol lang="en">
                <li v-for="(step, index) in exercise.instructionsEn" :key="index">{{ step }}</li>
              </ol>
              <p class="small">{{ t('exercise.cues.englishOnly') }}</p>
            </template>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ t('exercise.machine.title') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <h2 class="section">{{ t('exercise.steps.title') }}</h2>
            <LoadStepsEditor
              :steps="entry.loadSteps"
              :equipment="exercise.equipment"
              @change="onStepsChange(exercise.id, $event)"
            />
            <p class="small" role="status">
              {{ stepsSaved ? t('exercise.steps.saved') : '' }}
            </p>
            <div class="photo">
              <img
                v-if="entry.platePhoto"
                :src="entry.platePhoto"
                :alt="t('exercise.machine.photoAlt', { name: title })"
              />
              <label class="photo-button">
                {{
                  entry.platePhoto
                    ? t('exercise.machine.photoReplace')
                    : t('exercise.machine.photo')
                }}
                <input type="file" accept="image/*" capture="environment" @change="onPhoto" />
              </label>
              <ion-button
                v-if="entry.platePhoto"
                fill="clear"
                color="medium"
                size="small"
                @click="savePlatePhoto(exercise.id, undefined)"
              >
                {{ t('exercise.machine.photoDelete') }}
              </ion-button>
            </div>
            <ion-item lines="none">
              <ion-textarea
                :model-value="entry.note ?? ''"
                :label="t('exercise.machine.note')"
                label-placement="stacked"
                :placeholder="t('exercise.machine.notePlaceholder')"
                auto-grow
                :debounce="400"
                @ion-input="saveNote(exercise.id, String($event.detail.value ?? ''))"
              />
            </ion-item>
          </ion-card-content>
        </ion-card>

        <ExerciseProgress :exercise-id="exercise.id" :name="title" :steps="stepsForComeback" />

        <ComebackCard
          v-if="settings?.comeback"
          :exercise-id="exercise.id"
          :pause="settings.comeback.pause"
          :steps="stepsForComeback"
        />

        <ion-label>
          <p class="small">{{ t(`exercise.source.${exercise.source}`) }}</p>
        </ion-label>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.name {
  margin-block: 0 4px;
  font-size: 1.5rem;
}
.other-name {
  margin-block: 0 8px;
  color: var(--ion-color-medium);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  margin-block: 12px;
}
.icon {
  margin-inline-end: 8px;
}
.section {
  margin-block: 0;
  font-size: 1.05rem;
}
.photo {
  margin-block: 12px;
}
.photo img {
  display: block;
  max-width: 100%;
  border-radius: 8px;
  margin-block-end: 8px;
}
.photo-button {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding-inline: 12px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 8px;
  color: var(--ion-color-primary);
}
.photo-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.small {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
</style>
