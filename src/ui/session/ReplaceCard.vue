<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import ExercisePicker from '@/ui/ExercisePicker.vue';
import { useLoadLabel } from './useLoadLabel';
import { useSession } from './useSession';

/** Another machine for the same movement, or any exercise, instead of this one. */
const props = defineProps<{ exerciseId: string }>();
const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const session = useSession();
const loadOf = useLoadLabel();
const picking = ref(false);

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const thumbnailOf = (id: string) => {
  const image = illustrationFor(id)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
};
const options = computed(() => session.replacements(props.exerciseId));
const done = computed(() => session.workSetsInSession(props.exerciseId).length);

async function take(id: string): Promise<void> {
  picking.value = false;
  await session.replaceExercise(props.exerciseId, id);
  emit('close');
}
</script>

<template>
  <ion-card class="replace">
    <ion-card-header>
      <ion-card-title>{{
        t('session.replaceCard.title', { name: nameOf(exerciseId) })
      }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p>
        {{
          done > 0
            ? t('session.replaceCard.keepDone', { count: done, name: nameOf(exerciseId) }, done)
            : t('session.replaceCard.help')
        }}
      </p>
      <ul class="options">
        <li v-for="e in options" :key="e.id" class="option">
          <router-link
            v-if="thumbnailOf(e.id)"
            :to="`/tabs/session/exercise/${encodeURIComponent(e.id)}`"
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
              @click="take(e.id)"
            >
              {{ t('session.alternative.take') }}
            </ion-button>
          </div>
        </li>
      </ul>
      <p v-if="options.length === 0">{{ t('session.replaceCard.none') }}</p>
      <ion-button expand="block" fill="outline" @click="picking = true">
        {{ t('session.replaceCard.other') }}
      </ion-button>
      <ion-button expand="block" fill="clear" @click="emit('close')">
        {{ t('session.continue') }}
      </ion-button>
      <ExercisePicker
        :open="picking"
        :title="t('session.replaceCard.other')"
        :exclude="[exerciseId]"
        :suggested="session.sameMovement(exerciseId)"
        @pick="take"
        @close="picking = false"
      />
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
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
