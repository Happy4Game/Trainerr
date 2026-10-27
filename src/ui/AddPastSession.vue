<script setup lang="ts">
import { IonButton, IonInput, IonSelect, IonSelectOption, useIonRouter } from '@ionic/vue';
import { CalendarPlus } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { rotationFor } from '@/domain/trainingModels';
import { useSession } from '@/ui/session/useSession';
import { useSettings } from '@/ui/useSettings';
import { useTemplateName } from '@/ui/useTemplateName';
import { todayIso } from '@/ui/useWeekPlan';

/**
 * A session done without the app (phone forgotten, another gym…), added
 * afterwards: it counts in the history, the stats and the cycle like the others.
 */
const { t } = useI18n();
const templateLabel = useTemplateName();
const { settings } = useSettings();
const session = useSession();
const router = useIonRouter();

const open = ref(false);
const date = ref(todayIso());
/** The program's sessions, then the user's own, then a free one. */
const choices = computed(() => [
  ...(settings.value ? rotationFor(settings.value.model).map((r) => r.id) : []),
  ...(settings.value?.customSessions ?? []).map((c) => `custom:${c.id}`),
  'manual',
]);
const templateId = ref<string>();
const chosen = computed(() => templateId.value ?? session.template.value?.id ?? 'manual');
const sameBefore = computed(() => session.history.value.some((s) => s.templateId === chosen.value));

const saving = ref(false);
async function create(): Promise<void> {
  if (saving.value || !date.value || date.value > todayIso()) return;
  saving.value = true;
  try {
    const id = await session.addPastSession({ date: date.value, templateId: chosen.value });
    open.value = false;
    router.push(`/tabs/history/${id}`);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ion-button v-if="!open" expand="block" fill="outline" class="open" @click="open = true">
    <CalendarPlus :size="20" aria-hidden="true" class="icon" />
    {{ t('pastSession.open') }}
  </ion-button>
  <section v-else class="past" :aria-label="t('pastSession.title')">
    <h2>{{ t('pastSession.title') }}</h2>
    <p class="help">{{ t('pastSession.help') }}</p>
    <ion-input
      type="date"
      fill="outline"
      :label="t('historyEdit.date')"
      label-placement="stacked"
      :max="todayIso()"
      :value="date"
      @ion-change="date = String($event.detail.value ?? '')"
    />
    <ion-select
      fill="outline"
      :label="t('pastSession.type')"
      label-placement="stacked"
      interface="action-sheet"
      :value="chosen"
      @ion-change="templateId = $event.detail.value"
    >
      <ion-select-option v-for="id in choices" :key="id" :value="id">
        {{ templateLabel(id) }}
      </ion-select-option>
    </ion-select>
    <p class="help">
      {{ sameBefore ? t('pastSession.prefilled') : t('pastSession.empty') }}
    </p>
    <ion-button expand="block" :disabled="saving || !date || date > todayIso()" @click="create">
      {{ t('pastSession.create') }}
    </ion-button>
    <ion-button expand="block" fill="clear" @click="open = false">
      {{ t('picker.cancel') }}
    </ion-button>
  </section>
</template>

<style scoped>
.open {
  margin-block-end: var(--tr-space-4);
}
.icon {
  margin-inline-end: 8px;
}
.past {
  display: grid;
  gap: var(--tr-space-3);
  margin-block-end: var(--tr-space-4);
  padding: var(--tr-space-4);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-l);
  background: var(--ion-card-background);
}
.past h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}
.help {
  margin: 0;
  color: var(--tr-text-muted);
  font-size: 0.9rem;
}
</style>
