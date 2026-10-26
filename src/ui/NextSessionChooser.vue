<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { rotationFor } from '@/domain/trainingModels';
import { rescheduleNotifications } from '@/ui/notifications';
import { useSession } from '@/ui/session/useSession';
import { updateSettings, useSettings } from '@/ui/useSettings';
import { useTemplateName } from '@/ui/useTemplateName';

/**
 * The rotation from the next session due: touching another one starts the
 * cycle there (already mid-cycle, sessions imported from another app).
 */
defineProps<{ title: string; help: string }>();

const { t } = useI18n();
const templateLabel = useTemplateName();
const { settings } = useSettings();
const session = useSession();

const order = computed(() => {
  const rotation = settings.value ? rotationFor(settings.value.model) : [];
  const first = rotation.findIndex((r) => r.id === session.template.value?.id);
  return rotation.map((_, i) => rotation[(Math.max(first, 0) + i) % rotation.length]?.id ?? '');
});

async function choose(templateId: string): Promise<void> {
  const after = session.lastDoneSessionId.value;
  const saved = await updateSettings({
    nextChoice: { templateId, ...(after ? { afterSessionId: after } : {}) },
  });
  await rescheduleNotifications(saved);
  await session.reload();
}
</script>

<template>
  <section class="order" :aria-label="title">
    <h2>{{ title }}</h2>
    <p class="hint">{{ help }}</p>
    <div class="chips">
      <ion-button
        v-for="(id, i) in order"
        :key="id"
        size="small"
        :fill="i === 0 ? 'solid' : 'outline'"
        :aria-pressed="i === 0"
        @click="i > 0 && choose(id)"
      >
        <span v-if="i === 0" class="chip-tag">{{ t('planning.order.next') }}</span>
        {{ templateLabel(id) }}
      </ion-button>
    </div>
  </section>
</template>

<style scoped>
.order {
  margin-block-end: 8px;
}
h2 {
  margin-block: 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
}
.hint {
  margin: 0 0 8px;
  color: var(--ion-color-medium-shade);
  font-size: 0.9rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chips ion-button {
  margin: 0;
  --border-width: 1.5px;
}
.chip-tag {
  margin-inline-end: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  opacity: 0.85;
}
</style>
