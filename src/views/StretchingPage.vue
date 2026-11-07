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
  useIonRouter,
} from '@ionic/vue';
import { PersonStanding } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { STRETCHING_SOURCE_IDS, sourceById } from '@/data/content/sources';
import { stepsMinutes } from '@/domain/guidedSteps';
import { guidedStretching } from '@/domain/stretching';
import GuidedSteps from '@/ui/guided/GuidedSteps.vue';
import { STRETCHING_LABELS } from '@/ui/guided/guidedLabels';

/**
 * Guided stretches, at any time and outside any session: from Today or from
 * the end-of-session screen. Nothing is logged, the step reached lives only
 * on this screen.
 */
const { t } = useI18n();
const router = useIonRouter();
const moveText = (id: string, field: 'name' | 'how') => t(`stretching.moves.${id}.${field}`);
const steps = guidedStretching();
const minutes = stepsMinutes(steps);
const sources = STRETCHING_SOURCE_IDS.map(sourceById).filter((s) => s !== undefined);

const phase = ref<'intro' | 'running' | 'done'>('intro');
const index = ref(0);

function start(): void {
  index.value = 0;
  phase.value = 'running';
}
function leave(): void {
  if (router.canGoBack()) router.back();
  else router.navigate('/tabs/today', 'back', 'replace');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/today" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ t('guidedStretching.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <section v-if="phase === 'intro'" class="intro">
        <p>{{ t('guidedStretching.intro', { count: steps.length, minutes }) }}</p>
        <p class="muted">{{ t('guidedStretching.notBefore') }}</p>
        <h2>{{ t('guidedStretching.list') }}</h2>
        <ol class="list">
          <li v-for="step in steps" :key="step.id">
            <strong>{{ t(`stretching.moves.${step.id}.name`) }}</strong>
            <span class="muted">
              · {{ (step.muscles ?? []).map((m) => t(`muscles.${m}`)).join(', ') }}
            </span>
          </li>
        </ol>
        <ion-button expand="block" size="large" @click="start">
          {{ t('guidedStretching.start') }}
        </ion-button>
        <details class="review">
          <summary>{{ t('guided.review') }}</summary>
          <ul>
            <li v-for="source in sources" :key="source.id">
              <a :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
            </li>
          </ul>
        </details>
      </section>

      <GuidedSteps
        v-else-if="phase === 'running'"
        :steps="steps"
        :index="index"
        :labels="STRETCHING_LABELS"
        :move-text="moveText"
        :part-icon="PersonStanding"
        :sources="sources"
        @step="index = $event"
        @finish="phase = 'done'"
        @skip="leave"
      />

      <section v-else class="done" role="status">
        <span class="check" aria-hidden="true">✓</span>
        <h2>{{ t('guidedStretching.done') }}</h2>
        <ion-button expand="block" size="large" @click="leave">
          {{ t('guidedStretching.back') }}
        </ion-button>
        <ion-button expand="block" fill="clear" @click="start">
          {{ t('guidedStretching.again') }}
        </ion-button>
      </section>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.muted {
  color: var(--tr-text-muted);
}
.intro h2 {
  margin-block: var(--tr-space-4) var(--tr-space-2);
  font-size: var(--tr-font-l, 1.15rem);
}
.list {
  padding-inline-start: 1.4em;
  margin-block: 0 var(--tr-space-4);
}
.list li {
  margin-block-end: 6px;
}
.review {
  margin-block-start: var(--tr-space-4);
  font-size: 0.75rem;
  color: var(--tr-text-muted);
}
.review summary {
  cursor: pointer;
}
.done {
  text-align: center;
  padding-block: var(--tr-space-5);
}
.check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--ion-color-success);
  color: #fff;
  font-size: 2rem;
  font-weight: 800;
}
</style>
