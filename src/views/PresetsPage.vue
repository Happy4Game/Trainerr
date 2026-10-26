<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { PRESET_MODELS } from '@/data/content/presetSessions';
import { ORDER_SOURCE_IDS, sourceById } from '@/data/content/sources';
import { resolvePreset, type PresetExercise, type PresetSession } from '@/domain/presets';
import ExerciseRow from '@/ui/ExerciseRow.vue';
import { useSession } from '@/ui/session/useSession';

const { t, n, locale } = useI18n();
const router = useIonRouter();
const session = useSession();

const sources = ORDER_SOURCE_IDS.map(sourceById).filter((s) => s !== undefined);

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};

function lines(preset: PresetSession) {
  return resolvePreset(preset, {
    isFavorite: (id) => session.entryOf(id)?.favorite === true,
    exists: (id) => session.entryOf(id) !== undefined,
  });
}

function rest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return t('presets.rest.seconds', { s });
  return s === 0 ? t('presets.rest.minutes', { m }) : t('presets.rest.minutesSeconds', { m, s });
}

function detail(line: PresetExercise): string {
  const range =
    line.reps.min === line.reps.max
      ? n(line.reps.min)
      : t('presets.repsRange', { min: n(line.reps.min), max: n(line.reps.max) });
  const reps = line.timed
    ? t('presets.seconds', { reps: range })
    : line.perSide
      ? t('presets.perSide', { reps: range })
      : range;
  return t('presets.line', { sets: line.sets, reps, rest: rest(line.restSeconds) });
}

async function start(preset: PresetSession): Promise<void> {
  await session.startPreset(preset.id);
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
        <ion-title>{{ t('presets.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="intro">{{ t('presets.intro') }}</p>

      <details class="principle">
        <summary>{{ t('presets.principle.title') }}</summary>
        <p>{{ t('presets.principle.p1') }}</p>
        <p>{{ t('presets.principle.p2') }}</p>
        <p>{{ t('presets.principle.p3') }}</p>
        <h3>{{ t('presets.principle.sources') }}</h3>
        <ul>
          <li v-for="source in sources" :key="source.id">
            <a :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
          </li>
        </ul>
      </details>

      <p v-if="session.catalogState.value.kind !== 'ready'" role="status">
        {{ t('catalog.loading') }}
      </p>
      <template v-else>
        <ion-card v-for="model in PRESET_MODELS" :key="model.id">
          <ion-card-header>
            <ion-card-title>{{ t(`presets.models.${model.id}.name`) }}</ion-card-title>
            <ion-card-subtitle>{{ t(`presets.models.${model.id}.summary`) }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <section
              v-for="preset in model.sessions"
              :key="preset.id"
              :aria-label="t(`presets.sessions.${preset.id}`)"
            >
              <h3 v-if="model.sessions.length > 1">{{ t(`presets.sessions.${preset.id}`) }}</h3>
              <ol class="lines">
                <li v-for="line in lines(preset)" :key="line.chosenId">
                  <ExerciseRow
                    :exercise-id="line.chosenId"
                    :name="nameOf(line.chosenId)"
                    :detail="detail(line)"
                    :to="`/tabs/session/exercise/${encodeURIComponent(line.chosenId)}`"
                  />
                  <p class="why">
                    <strong>{{ t(`presets.role.${line.role}`) }}</strong> ·
                    {{ t(`presets.why.${line.why}`) }}
                  </p>
                  <p v-if="line.chosenId !== line.exerciseId" class="replaced">
                    {{ t('presets.replaced', { main: nameOf(line.exerciseId) }) }}
                  </p>
                </li>
              </ol>
              <ion-button
                expand="block"
                :disabled="session.active.value !== undefined"
                @click="start(preset)"
              >
                {{ t('presets.start', { name: t(`presets.sessions.${preset.id}`) }) }}
              </ion-button>
            </section>
          </ion-card-content>
        </ion-card>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.intro {
  margin-block: 0 12px;
}
.principle {
  margin-block-end: 12px;
  padding: 10px 14px;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.principle summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  font-weight: 700;
  color: var(--ion-color-primary);
  cursor: pointer;
}
.principle h3 {
  font-size: 1rem;
}
.lines {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}
.lines li {
  border-block-end: 1px solid var(--ion-color-light-shade);
  padding-block-end: 6px;
}
.why,
.replaced {
  margin: 0 0 4px;
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}
.replaced {
  color: var(--ion-color-primary);
}
section + section {
  margin-block-start: 16px;
}
</style>
