<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { openAppDatabase } from '@/data/appDatabase';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { exercisesWithSets, moveMachineData } from '@/data/repositories/machineSplitRepository';
import {
  MACHINE_SPLITS,
  moveMachineSettings,
  pendingSplit,
  type MachineSplit,
} from '@/domain/machineSplits';
import { useSession } from '@/ui/session/useSession';
import { reloadCatalog, useCatalog } from '@/ui/useCatalog';
import { loadSettings, updateSettings } from '@/ui/useSettings';

/**
 * After an update that splits a machine in two (45° and horizontal leg press…):
 * on which one were the sets logged so far? Asked once, never during a session.
 */
const { t, locale } = useI18n();
const session = useSession();
const { entries } = useCatalog();

const split = ref<MachineSplit>();
/** Closed without answering: asked again at the next launch. */
const later = ref(false);
const saving = ref(false);
const open = computed(() => !!split.value && !later.value && !session.active.value);

async function next(): Promise<void> {
  const settings = await loadSettings();
  const { db } = await openAppDatabase();
  const used = await exercisesWithSets(
    db,
    MACHINE_SPLITS.map((s) => s.fromId),
  );
  const answered = { ...settings.machineSplits };
  // Nothing logged on it yet: nothing to move, the split is simply known from now on.
  const silent = MACHINE_SPLITS.filter((s) => answered[s.id] === undefined && !used.has(s.fromId));
  if (silent.length > 0) {
    for (const s of silent) answered[s.id] = s.fromId;
    await updateSettings({ machineSplits: answered });
  }
  split.value = pendingSplit(MACHINE_SPLITS, answered, (id) => used.has(id));
}
onMounted(() => void next().catch(() => undefined));
// A session finished: the machine may now have sets, the question may come.
watch(
  () => session.active.value,
  (active) => {
    if (!active) void next().catch(() => undefined);
  },
);

const choices = computed(() =>
  (split.value?.choices ?? []).map((id, index) => {
    const exercise = entries.value.find((e) => e.exercise.id === id)?.exercise;
    const image = illustrationFor(id)?.images[0];
    return {
      id,
      name: exercise ? (locale.value.startsWith('fr') ? exercise.name : exercise.nameEn) : id,
      hint: t(`machineSplit.${split.value?.id}.choice${index}`),
      ...(image ? { thumbnail: `${import.meta.env.BASE_URL}exercise-images/${image.file}` } : {}),
    };
  }),
);

async function choose(toId: string): Promise<void> {
  const current = split.value;
  if (!current || saving.value) return;
  saving.value = true;
  try {
    const { db } = await openAppDatabase();
    const settings = await loadSettings();
    const moved = moveMachineSettings(settings, current.fromId, toId);
    await moveMachineData(db, current.fromId, toId);
    await updateSettings({
      ...moved,
      machineSplits: { ...settings.machineSplits, [current.id]: toId },
    });
    if (toId !== current.fromId) {
      await reloadCatalog();
      await session.reload();
    }
    split.value = undefined;
    await next();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ion-modal :is-open="open" @did-dismiss="later = true">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('machineSplit.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content v-if="split" class="ion-padding">
      <p class="lead">{{ t(`machineSplit.${split.id}.intro`) }}</p>
      <p class="question">{{ t('machineSplit.question') }}</p>
      <ul class="choices">
        <li v-for="c in choices" :key="c.id">
          <button
            type="button"
            class="choice"
            :disabled="saving"
            :data-testid="`split-${c.id}`"
            @click="choose(c.id)"
          >
            <img v-if="c.thumbnail" :src="c.thumbnail" alt="" />
            <span v-else class="no-image" aria-hidden="true" />
            <span class="text">
              <strong>{{ c.name }}</strong>
              <span>{{ c.hint }}</span>
            </span>
          </button>
        </li>
      </ul>
      <ion-button expand="block" fill="clear" :disabled="saving" @click="choose(split.fromId)">
        {{ t('machineSplit.both') }}
      </ion-button>
      <p class="note">{{ t('machineSplit.note') }}</p>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.lead {
  margin-top: 0;
}
.question {
  font-weight: 700;
  font-size: 1.1rem;
}
.choices {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: grid;
  gap: 10px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 72px;
  padding: 10px;
  border: 2px solid var(--ion-color-light);
  border-radius: 14px;
  background: var(--ion-card-background);
  color: inherit;
  font: inherit;
  text-align: start;
}
.choice:active {
  border-color: var(--ion-color-primary);
}
.choice img,
.no-image {
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  background: #fff;
  object-fit: contain;
}
.no-image {
  background: var(--ion-color-light);
}
.text {
  display: grid;
  gap: 2px;
}
.text span {
  color: var(--ion-color-medium-shade);
  font-size: 0.9rem;
}
.note {
  color: var(--ion-color-medium-shade);
  font-size: 0.85rem;
}
</style>
