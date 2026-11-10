<script setup lang="ts">
import { RotateCw } from 'lucide-vue-next';
import { computed } from 'vue';
import { warmupIllustrationFor } from '@/data/catalog/exerciseImages';
import { JOINT_WARMUP_SOURCE_IDS, sourceById } from '@/data/content/sources';
import { guidedWarmup } from '@/domain/guidedWarmup';
import { useI18n } from 'vue-i18n';
import GuidedSteps from '@/ui/guided/GuidedSteps.vue';
import { WARMUP_LABELS } from '@/ui/guided/guidedLabels';
import { useSession } from './useSession';

/**
 * Guided warm-up before the first machine, one move at a time like the
 * session: light cardio, then the joints and muscles of today's session. The
 * move reached is kept in the session (it stays after the app is closed).
 * Recommended, never imposed: "Passer l'échauffement" at the top, at every step.
 */
const { t } = useI18n();
const session = useSession();
const moveText = (id: string, field: 'name' | 'how') => t(`mobility.moves.${id}.${field}`);
const steps = computed(() => {
  const plan = session.active.value?.plan;
  const groups = (plan?.exercises ?? []).flatMap((e) => {
    const group = session.entryOf(e.exerciseId)?.exercise.group;
    return group ? [group] : [];
  });
  const cardio = plan?.cardio;
  return guidedWarmup({
    groups,
    cardioBefore: cardio?.position === 'before' && cardio.skipped !== true,
  });
});
const sources = JOINT_WARMUP_SOURCE_IDS.map(sourceById).filter((s) => s !== undefined);
const index = computed(() => session.active.value?.plan.guidedWarmup?.step ?? 0);
</script>

<template>
  <GuidedSteps
    :steps="steps"
    :index="index"
    :labels="WARMUP_LABELS"
    :move-text="moveText"
    :part-icon="RotateCw"
    :sources="sources"
    :illustration-for="warmupIllustrationFor"
    @step="session.guidedWarmupStep"
    @finish="session.endGuidedWarmup(false)"
    @skip="session.endGuidedWarmup(true)"
  />
</template>
