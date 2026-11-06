<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/vue';
import { ArrowLeftRight, Clock } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import type { Alternative } from '@/domain/busyMachine';
import ExercisePicker from '@/ui/ExercisePicker.vue';
import { useLoadLabel } from './useLoadLabel';
import { useSession } from './useSession';
import { useUnits } from '@/ui/useUnits';

/**
 * One sheet to leave this machine, with two clear ways:
 * - "Busy": another machine now, this one comes back right after.
 * - "Replace": another machine for the rest of the session.
 * Nothing changes until an option is taken: closing the sheet keeps the session as it was.
 */
const props = defineProps<{ exerciseId: string; mode: 'busy' | 'replace' }>();
const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const session = useSession();
const loadOf = useLoadLabel();
const { load: kg } = useUnits();
const picking = ref(false);
const mode = ref(props.mode);

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const thumbnailOf = (id: string) => {
  const image = illustrationFor(id)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
};
const cardLink = (id: string) => `/tabs/session/exercise/${encodeURIComponent(id)}`;
const musclesOf = (id: string) =>
  (session.entryOf(id)?.exercise.primaryMuscles ?? []).map((m) => t(`muscles.${m}`)).join(', ');

// Taken once, when the sheet opens: the list does not move under the finger.
const alternatives: Alternative[] = session.alternatives(props.exerciseId);
const replacements = computed(() => session.replacements(props.exerciseId));
const done = computed(() => session.workSetsInSession(props.exerciseId).length);

/** Another machine now; the busy one is offered again right after. */
async function meanwhile(alternative: Alternative): Promise<void> {
  await session.markMachineBusy(props.exerciseId);
  await session.chooseAlternative(alternative);
  emit('close');
}
/** Nothing else now: the next exercise, the busy one is offered again later. */
async function later(): Promise<void> {
  await session.markMachineBusy(props.exerciseId);
  emit('close');
}
async function replace(id: string): Promise<void> {
  picking.value = false;
  await session.replaceExercise(props.exerciseId, id);
  emit('close');
}
</script>

<template>
  <ion-card class="replace">
    <ion-card-header>
      <ion-card-title>{{ t('session.switch.title', { name: nameOf(exerciseId) }) }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <div class="modes" role="radiogroup" :aria-label="t('session.switch.why')">
        <button
          type="button"
          role="radio"
          :aria-checked="mode === 'busy'"
          :class="{ on: mode === 'busy' }"
          @click="mode = 'busy'"
        >
          <Clock :size="22" aria-hidden="true" />
          <strong>{{ t('session.switch.busy') }}</strong>
          <small>{{ t('session.switch.busySub') }}</small>
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="mode === 'replace'"
          :class="{ on: mode === 'replace' }"
          @click="mode = 'replace'"
        >
          <ArrowLeftRight :size="22" aria-hidden="true" />
          <strong>{{ t('session.switch.replace') }}</strong>
          <small>{{ t('session.switch.replaceSub') }}</small>
        </button>
      </div>

      <template v-if="mode === 'busy'">
        <p class="help">{{ t('session.switch.busyHelp', { name: nameOf(exerciseId) }) }}</p>
        <ul class="options">
          <li v-for="alternative in alternatives" :key="alternative.exercise.id" class="option">
            <router-link
              v-if="thumbnailOf(alternative.exercise.id)"
              :to="cardLink(alternative.exercise.id)"
              class="thumb-link"
              :aria-label="t('session.seeMovementOf', { name: nameOf(alternative.exercise.id) })"
            >
              <img :src="thumbnailOf(alternative.exercise.id)" alt="" class="thumb" />
            </router-link>
            <div class="body">
              <h3>{{ nameOf(alternative.exercise.id) }}</h3>
              <p class="detail">
                {{ t(`session.alternative.${alternative.kind}`) }} ·
                {{ musclesOf(alternative.exercise.id) }}
                <template v-if="alternative.loadKg !== undefined">
                  · {{ kg(alternative.loadKg) }}
                </template>
              </p>
              <ion-button
                size="small"
                :aria-label="
                  t('session.alternative.meanwhileNamed', {
                    name: nameOf(alternative.exercise.id),
                  })
                "
                @click="meanwhile(alternative)"
              >
                {{ t('session.alternative.take') }}
              </ion-button>
            </div>
          </li>
        </ul>
        <p v-if="alternatives.length === 0">{{ t('session.alternative.none') }}</p>
        <ion-button expand="block" fill="outline" @click="later">
          {{ t('session.switch.later') }}
        </ion-button>
      </template>

      <template v-else>
        <p class="help">
          {{
            done > 0
              ? t('session.replaceCard.keepDone', { count: done, name: nameOf(exerciseId) }, done)
              : t('session.replaceCard.help')
          }}
        </p>
        <ul class="options">
          <li v-for="e in replacements" :key="e.id" class="option">
            <router-link
              v-if="thumbnailOf(e.id)"
              :to="cardLink(e.id)"
              class="thumb-link"
              :aria-label="t('session.seeMovementOf', { name: nameOf(e.id) })"
            >
              <img :src="thumbnailOf(e.id)" alt="" class="thumb" />
            </router-link>
            <div class="body">
              <h3>{{ nameOf(e.id) }}</h3>
              <p class="detail">
                <template v-if="session.entryOf(e.id)?.favorite"
                  >{{ t('session.replaceCard.mine') }} ·
                </template>
                {{ t(`equipment.${e.equipment}`) }}
                <template v-if="session.proposalFor(e.id)">
                  · {{ loadOf(e.id, session.proposalFor(e.id)?.loadKg ?? 0) }}
                </template>
              </p>
              <ion-button
                size="small"
                :aria-label="t('session.alternative.choose', { name: nameOf(e.id) })"
                @click="replace(e.id)"
              >
                {{ t('session.alternative.take') }}
              </ion-button>
            </div>
          </li>
        </ul>
        <p v-if="replacements.length === 0">{{ t('session.replaceCard.none') }}</p>
        <ion-button expand="block" fill="outline" @click="picking = true">
          {{ t('session.replaceCard.other') }}
        </ion-button>
      </template>

      <ion-button expand="block" fill="clear" color="medium" @click="emit('close')">
        {{ t('session.switch.cancel', { name: nameOf(exerciseId) }) }}
      </ion-button>
      <ExercisePicker
        :open="picking"
        :title="t('session.replaceCard.other')"
        :exclude="[exerciseId]"
        :suggested="session.sameMovement(exerciseId)"
        @pick="replace"
        @close="picking = false"
      />
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-block-end: 8px;
}
.modes button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 76px;
  padding: 8px;
  border: 2px solid var(--ion-color-light-shade, #ccc);
  border-radius: 14px;
  background: transparent;
  color: var(--ion-text-color);
  font: inherit;
}
.modes button.on {
  border-color: var(--ion-color-primary);
  background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent);
  color: var(--ion-color-primary);
}
.modes strong {
  font-size: 1rem;
}
.modes small {
  font-size: 0.78rem;
  color: var(--ion-color-medium-shade);
}
.help {
  margin: 4px 0;
}
.options {
  margin: 8px 0;
  padding: 0;
  list-style: none;
}
.option {
  display: flex;
  gap: 12px;
  padding-block: 10px;
  border-block-end: 1px solid var(--ion-color-light);
}
.thumb {
  flex: none;
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 10px;
  /* Black-on-white drawing: white card in the dark theme too. */
  background: #fff;
}
.body h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ion-text-color, #000);
}
.detail {
  margin: 2px 0 4px;
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}
/* The drawing opens the machine card. */
.thumb-link {
  display: inline-block;
  flex: none;
  line-height: 0;
}
</style>
