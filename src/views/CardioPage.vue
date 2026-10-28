<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  cardioMachine,
  WHO_WEEKLY_MINUTES,
  type CardioEntry,
  type DatedCardio,
  cardioDrawing,
  type CardioId,
} from '@/domain/cardio';
import CardioEntryModal from '@/ui/cardio/CardioEntryModal.vue';
import { useCardioText } from '@/ui/cardio/useCardioText';
import MuscleMap from '@/ui/muscleMap/MuscleMap.vue';
import { useCardio } from '@/ui/session/useCardio';

/** A cardio machine: the muscles it works, the advice, and my results on it. */
const props = defineProps<{ id: string }>();

const { t, n, locale } = useI18n();
const text = useCardioText();
const drawingOf = (id: CardioId) => `${import.meta.env.BASE_URL}${cardioDrawing(id)}`;
const cardio = useCardio();

const machine = computed(() => cardioMachine(props.id));
const history = computed(() =>
  cardio.logs.value
    .filter((l) => l.cardioId === props.id)
    .slice()
    .reverse(),
);
const longest = computed(() => Math.max(0, ...history.value.map((l) => l.distanceKm ?? 0)));
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

const open = ref(false);
const editing = ref<DatedCardio>();
const initial = computed<Partial<CardioEntry>>(
  () => editing.value ?? { cardioId: machine.value?.id ?? 'treadmill' },
);
function openNew(): void {
  editing.value = undefined;
  open.value = true;
}
async function save(entry: CardioEntry): Promise<void> {
  if (editing.value) await cardio.update(editing.value.id, entry);
  else await cardio.add(entry);
  open.value = false;
}
async function remove(): Promise<void> {
  if (editing.value) await cardio.remove(editing.value.id);
  open.value = false;
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/catalog" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ machine ? text.name(machine.id) : t('cardio.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="!machine">{{ t('cardio.page.unknown') }}</p>
      <template v-else>
        <figure class="drawing">
          <img
            :src="drawingOf(machine.id)"
            :alt="t('cardio.drawing.alt', { name: text.name(machine.id) })"
          />
          <figcaption>{{ t('cardio.drawing.ai') }}</figcaption>
        </figure>
        <p>{{ t(`cardio.descriptions.${machine.id}`) }}</p>

        <h2>{{ t('cardio.page.worked') }}</h2>
        <MuscleMap :primary="machine.primaryMuscles" :secondary="machine.secondaryMuscles" />

        <h2>{{ t('cardio.page.week') }}</h2>
        <p>
          {{
            t('cardio.week.long', {
              minutes: cardio.week.value.moderate,
              target: WHO_WEEKLY_MINUTES.min,
            })
          }}
        </p>
        <p class="hint">{{ t('cardio.week.help') }}</p>

        <ion-button expand="block" @click="openNew">{{ t('cardio.page.logToday') }}</ion-button>

        <h2>{{ t('cardio.page.history') }}</h2>
        <p v-if="history.length === 0" class="hint">{{ t('cardio.page.noHistory') }}</p>
        <p v-else-if="longest > 0" class="hint">
          {{ t('cardio.page.longest', { km: n(longest) }) }}
        </p>
        <ul class="history">
          <li v-for="entry in history" :key="entry.id">
            <button
              type="button"
              class="entry"
              :aria-label="t('cardio.page.editNamed', { date: shortDate(entry.date) })"
              @click="((editing = entry), (open = true))"
            >
              <strong>{{ shortDate(entry.date) }}</strong>
              <span>{{ text.detail(entry) }}</span>
            </button>
          </li>
        </ul>
        <router-link to="/tabs/settings/tips" class="tips">{{
          t('cardio.advice.more')
        }}</router-link>
      </template>
      <CardioEntryModal
        :open="open"
        :initial="initial"
        :removable="editing !== undefined"
        @save="save"
        @remove="remove"
        @close="open = false"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.drawing {
  margin: 0;
}
.drawing img {
  display: block;
  width: 100%;
  max-height: 220px;
  padding: 12px;
  border-radius: 12px;
  object-fit: contain;
  /* Black-on-white drawing: white card in the dark theme too. */
  background: #fff;
}
.drawing figcaption {
  margin-block-start: 6px;
  color: var(--tr-text-muted);
  font-size: 0.8rem;
}
h2 {
  margin-block: 20px 8px;
  font-size: 1.1rem;
}
.hint {
  color: var(--tr-text-muted);
  font-size: 0.9rem;
}
.history {
  margin: 0;
  padding: 0;
  list-style: none;
}
.entry {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid var(--tr-surface-2);
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
}
.tips {
  display: inline-block;
  margin-block-start: 16px;
}
</style>
