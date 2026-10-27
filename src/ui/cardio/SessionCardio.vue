<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { Pencil } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { cardioMachine, type CardioEntry, type DatedCardio } from '@/domain/cardio';
import { useCardio } from '@/ui/session/useCardio';
import { useSession } from '@/ui/session/useSession';
import CardioEntryModal from './CardioEntryModal.vue';
import CardioIcon from './CardioIcon.vue';
import { useCardioText } from './useCardioText';

/**
 * Cardio of the session in progress. At the top: the cardio planned before
 * the weights, until it is logged. At the bottom: the cardio planned after,
 * what was logged, and a button to add some on the spot.
 */
const props = defineProps<{ place: 'top' | 'bottom' }>();

const { t } = useI18n();
const session = useSession();
const cardio = useCardio();
const text = useCardioText();

const active = computed(() => session.active.value);
const plan = computed(() => active.value?.plan.cardio);
const logged = computed(() => (active.value ? cardio.ofSession(active.value.id) : []));
const waiting = (position: 'before' | 'after') =>
  plan.value?.position === position && !plan.value.skipped && logged.value.length === 0;
/** The planned cardio, waiting at its place. */
const planned = computed(() =>
  props.place === 'top' ? waiting('before') : waiting('after') ? plan.value : undefined,
);
const shown = computed(() => (props.place === 'top' ? waiting('before') : !waiting('before')));

const editing = ref<DatedCardio>();
const open = ref(false);
const initial = computed<Partial<CardioEntry> | undefined>(
  () =>
    editing.value ??
    (plan.value ? { cardioId: plan.value.cardioId, minutes: plan.value.minutes } : undefined),
);

function openNew(): void {
  editing.value = undefined;
  open.value = true;
}
async function save(entry: CardioEntry): Promise<void> {
  if (!active.value) return;
  if (editing.value) await cardio.update(editing.value.id, entry);
  else await cardio.add(entry, active.value);
  open.value = false;
}
async function remove(): Promise<void> {
  if (editing.value) await cardio.remove(editing.value.id);
  open.value = false;
}
</script>

<template>
  <template v-if="shown">
    <section
      v-if="planned && plan"
      class="planned"
      :aria-label="t(place === 'top' ? 'cardio.session.beforeTitle' : 'cardio.session.afterTitle')"
    >
      <p class="title">
        <CardioIcon :icon="cardioMachine(plan.cardioId)?.icon ?? 'activity'" :size="20" />
        {{ t(place === 'top' ? 'cardio.session.beforeTitle' : 'cardio.session.afterTitle') }}
      </p>
      <p>
        {{
          t('cardio.session.target', { machine: text.name(plan.cardioId), minutes: plan.minutes })
        }}
      </p>
      <ion-button expand="block" @click="openNew">{{ t('cardio.session.log') }}</ion-button>
      <ion-button expand="block" fill="clear" color="medium" @click="session.skipCardio(true)">
        {{ t('cardio.session.skip') }}
      </ion-button>
    </section>
    <template v-else>
      <ul v-if="logged.length > 0" class="logged" :aria-label="t('cardio.title')">
        <li v-for="entry in logged" :key="entry.id">
          <button
            type="button"
            class="entry"
            :aria-label="t('cardio.session.edit', { machine: text.name(entry.cardioId) })"
            @click="((editing = entry), (open = true))"
          >
            <CardioIcon :icon="cardioMachine(entry.cardioId)?.icon ?? 'activity'" :size="18" />
            <span>
              <strong>{{ text.name(entry.cardioId) }}</strong>
              {{ text.detail(entry) }}
            </span>
            <Pencil :size="16" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-if="plan?.skipped && logged.length === 0" class="skipped">
        {{ t('cardio.session.skipped') }}
        <button type="button" class="link" @click="session.skipCardio(false)">
          {{ t('cardio.session.unskip') }}
        </button>
      </p>
      <ion-button expand="block" fill="outline" @click="openNew">
        {{ t('cardio.session.add') }}
      </ion-button>
    </template>
  </template>
  <CardioEntryModal
    :open="open"
    :initial="initial"
    :position="editing?.position ?? (place === 'top' ? 'before' : (plan?.position ?? 'after'))"
    :removable="editing !== undefined"
    @save="save"
    @remove="remove"
    @close="open = false"
  />
</template>

<style scoped>
.planned {
  margin-block: var(--tr-space-3);
  padding: var(--tr-space-3);
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface-2);
}
.planned p {
  margin: 0 0 8px;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}
.logged {
  margin: var(--tr-space-3) 0 0;
  padding: 0;
  list-style: none;
}
.entry {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
}
.entry span {
  flex: 1;
}
.entry strong {
  display: block;
}
.skipped {
  color: var(--tr-text-muted);
  font-size: 0.9rem;
}
.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ion-color-primary);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
}
</style>
