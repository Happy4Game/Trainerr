<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonToggle,
} from '@ionic/vue';
import { House, LayoutList, Pencil, Play, Plus, Zap } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { estimateMinutes } from '@/domain/sessionPreview';
import type { SessionTemplate } from '@/domain/trainingModels';
import type { Exercise } from '@/domain/types';
import MobilityCard from '@/ui/MobilityCard.vue';
import { useSettings } from '@/ui/useSettings';
import { useTemplateName } from '@/ui/useTemplateName';
import SessionPlanList from './SessionPlanList.vue';
import UsualLoads from './UsualLoads.vue';
import { useLoadLabel } from './useLoadLabel';
import { usePlanInsights } from './usePlanInsights';
import { useSession } from './useSession';

/**
 * Before the session: the session of the day first (what, how long, one big
 * button), then the other ways to train today and my own sessions.
 */
defineProps<{ template: SessionTemplate }>();

const { t, locale } = useI18n();
const templateLabel = useTemplateName();
const session = useSession();
const { preview, readyMade } = session;
const { settings: appSettings } = useSettings();
const loadOf = useLoadLabel();

const nameOf = (id: string) => {
  const entry = session.entryOf(id);
  if (!entry) return id;
  return locale.value.startsWith('fr') ? entry.exercise.name : entry.exercise.nameEn;
};
const exerciseName = (e: Exercise) => nameOf(e.id);
const cardLink = (id: string) => `/tabs/session/exercise/${encodeURIComponent(id)}`;
// Supersets are offered, never imposed: on by default only if chosen in the settings.
const supersetChoice = ref<boolean>();
const useSupersets = computed(() => supersetChoice.value ?? appSettings.value?.supersets ?? false);
const customSessions = computed(() => appSettings.value?.customSessions ?? []);
/** "I am a beginner" in the questionnaire, first sessions: the beginner full body is offered first. */
const beginnerStart = computed(
  () => appSettings.value?.level === 'beginner' && session.history.value.length < 3,
);
/** "3 sets · 20 kg" under an exercise of the plan. */
const planDetail = (id: string) =>
  `${t('session.nextMachine.plan', session.plannedSets(id))} · ${loadOf(id, session.proposalFor(id)?.loadKg ?? 0)}`;
/** Work sets of the session of the day, and a rough length. */
const planSets = computed(() =>
  preview.value.reduce((total, e) => total + session.plannedSets(e.id), 0),
);
const planMinutes = computed(() => estimateMinutes(planSets.value));
/** Card of a machine; a banner there leads back to the session. */
const suggestedBadge = (id: string) =>
  preview.value.length > 0 && readyMade.value?.suggestedIds.includes(id)
    ? t('session.readyMade.suggested')
    : undefined;
/** Same insights as on Today: loads going up, muscles caught up. */
const insights = usePlanInsights(preview);
</script>

<template>
  <!-- Someone who starts out: the simplest session first, in one tap. -->
  <ion-card v-if="beginnerStart" class="beginner">
    <ion-card-header>
      <ion-card-title>{{ t('presets.beginner.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p>{{ t('presets.beginner.text') }}</p>
      <ion-button expand="block" size="large" @click="session.startPreset('fullBodyBeginner')">
        {{ t('presets.start', { name: t('presets.sessions.fullBodyBeginner') }) }}
      </ion-button>
      <ion-button expand="block" fill="clear" router-link="/tabs/session/presets">
        {{ t('presets.beginner.details') }}
      </ion-button>
    </ion-card-content>
  </ion-card>
  <!-- The session of the day first: what, how long, and one big button. -->
  <section
    class="day-card"
    :aria-label="t('session.next', { template: templateLabel(template.id) })"
  >
    <p class="day-eyebrow">
      {{
        session.cycle.value.light
          ? t('cycle.light', session.cycle.value)
          : t('cycle.week', session.cycle.value)
      }}
    </p>
    <h2 class="day-title">{{ templateLabel(template.id) }}</h2>
    <p v-if="preview.length > 0" class="day-meta">
      <span>{{ t('customSession.exercises', preview.length) }}</span>
      <span>{{ t('session.menu.sets', planSets) }}</span>
      <span>{{ t('session.menu.minutes', { minutes: planMinutes }) }}</span>
    </p>
    <p v-if="preview.length > 0 && insights.goingUp.value > 0" class="day-hint">
      {{ t('today.goingUp', insights.goingUp.value) }}
    </p>
    <p v-if="preview.length > 0 && insights.catchUpText.value" class="day-hint">
      {{ insights.catchUpText.value }}
    </p>
    <template v-if="preview.length > 0">
      <SessionPlanList
        :exercises="preview"
        :supersets="useSupersets"
        :name="exerciseName"
        :detail="planDetail"
        :to="cardLink"
        :badge="insights.changeText"
        swappable
      />
      <UsualLoads :exercises="preview" />
      <ion-button
        class="day-start"
        expand="block"
        size="large"
        @click="session.start({ supersets: useSupersets })"
      >
        <Play :size="22" aria-hidden="true" />
        {{ t('session.start') }}
      </ion-button>
      <ion-item lines="none" class="superset-choice">
        <ion-toggle
          :checked="session.tiredToday.value"
          @ion-change="session.tiredToday.value = $event.detail.checked"
        >
          <span class="toggle-title">{{ t('session.tired.toggle') }}</span>
          <span class="toggle-help">{{ t('session.tired.help') }}</span>
        </ion-toggle>
      </ion-item>
      <ion-item lines="none" class="superset-choice">
        <ion-toggle :checked="useSupersets" @ion-change="supersetChoice = $event.detail.checked">
          <span class="toggle-title">{{ t('session.supersetToggle') }}</span>
          <span class="toggle-help">{{ t('session.supersetToggleHelp') }}</span>
        </ion-toggle>
      </ion-item>
    </template>
    <template v-else-if="!readyMade">
      <p>{{ t('session.noFavorites', { template: templateLabel(template.id) }) }}</p>
      <ion-button expand="block" fill="outline" router-link="/tabs/catalog">
        {{ t('session.goToCatalog') }}
      </ion-button>
    </template>
    <!-- Not enough favorites: a ready-made session with popular machines. -->
    <section v-if="readyMade" class="ready-made" :aria-label="t('session.readyMade.title')">
      <h3>{{ t('session.readyMade.title') }}</h3>
      <p class="muted">
        {{
          preview.length === 0
            ? t('session.readyMade.introNone')
            : t('session.readyMade.intro', preview.length)
        }}
      </p>
      <SessionPlanList
        :exercises="readyMade.exercises"
        :supersets="useSupersets"
        :name="exerciseName"
        :detail="planDetail"
        :to="cardLink"
        :badge="suggestedBadge"
      />
      <ion-button
        expand="block"
        size="large"
        @click="session.start({ readyMade: true, supersets: useSupersets })"
      >
        {{ t('session.readyMade.start') }}
      </ion-button>
      <ion-button expand="block" fill="outline" @click="session.adoptReadyMade()">
        {{ t('session.readyMade.adopt', readyMade.suggestedIds.length) }}
      </ion-button>
      <ion-button expand="block" fill="clear" router-link="/tabs/catalog">
        {{ t('session.goToCatalog') }}
      </ion-button>
    </section>
  </section>

  <!-- Other ways to train today: big tiles, one tap each. -->
  <h2 class="menu-heading">{{ t('session.menu.other') }}</h2>
  <div class="ways">
    <button
      v-if="session.expressPreview.value.length > 0"
      type="button"
      class="way"
      @click="session.start({ express: true, supersets: useSupersets })"
    >
      <Zap :size="26" aria-hidden="true" />
      <span class="way-title">{{ t('session.express') }}</span>
      <span class="way-help">{{ t('session.menu.expressHelp') }}</span>
    </button>
    <router-link class="way" to="/tabs/session/presets">
      <LayoutList :size="26" aria-hidden="true" />
      <span class="way-title">{{ t('presets.open') }}</span>
      <span class="way-help">{{ t('session.menu.presetsHelp') }}</span>
    </router-link>
    <button
      v-if="session.homePreview.value.length > 0"
      type="button"
      class="way"
      @click="session.start({ home: true, supersets: useSupersets })"
    >
      <House :size="26" aria-hidden="true" />
      <span class="way-title">{{ t('session.home') }}</span>
      <span class="way-help">{{ t('session.menu.homeHelp') }}</span>
    </button>
    <router-link class="way" to="/tabs/session/custom/new">
      <Plus :size="26" aria-hidden="true" />
      <span class="way-title">{{ t('customSession.create') }}</span>
      <span class="way-help">{{ t('customSession.intro') }}</span>
    </router-link>
  </div>

  <section
    v-if="customSessions.length > 0"
    class="my-sessions"
    :aria-label="t('customSession.mine')"
  >
    <h2 class="menu-heading">{{ t('customSession.mine') }}</h2>
    <div v-for="c in customSessions" :key="c.id" class="custom">
      <div class="custom-text">
        <strong>{{ c.name }}</strong>
        <span class="muted">{{ t('customSession.exercises', c.exerciseIds.length) }}</span>
      </div>
      <ion-button
        fill="clear"
        size="small"
        :router-link="`/tabs/session/custom/${c.id}`"
        :aria-label="t('customSession.editNamed', { name: c.name })"
      >
        <Pencil :size="18" aria-hidden="true" />
      </ion-button>
      <ion-button
        size="small"
        :aria-label="t('customSession.startNamed', { name: c.name })"
        @click="session.start({ custom: c.id, supersets: useSupersets })"
      >
        <Play :size="18" aria-hidden="true" />
        {{ t('customSession.start') }}
      </ion-button>
    </div>
  </section>

  <MobilityCard :muscles="template.muscles" />
</template>

<style scoped>
.ready-made {
  margin-block-start: 12px;
}
.ready-made h3 {
  margin: 0 0 4px;
  font-size: 1.05rem;
}
.day-card {
  margin-block: 0 var(--tr-space-5);
  padding: var(--tr-space-5) var(--tr-space-4);
  border-radius: var(--tr-radius-l);
  background: var(--ion-card-background);
  box-shadow: var(--tr-shadow-1);
}
.day-eyebrow {
  margin: 0;
  font-size: 0.85rem;
  color: var(--tr-text-muted);
}
.day-title {
  margin: 2px 0 6px;
  font-size: var(--tr-font-xl);
  font-weight: var(--tr-weight-black);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.day-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 var(--tr-space-3);
}
.day-meta span {
  padding: 4px 10px;
  border-radius: var(--tr-radius-pill);
  background: var(--tr-surface-2);
  font-size: 0.85rem;
  font-weight: 700;
}
.day-hint {
  margin: 0 0 var(--tr-space-3);
  color: var(--tr-text-muted);
}
.day-start {
  margin-block-start: var(--tr-space-3);
  min-height: 56px;
  font-size: 1.1rem;
}
.day-start svg {
  margin-inline-end: 8px;
}
.menu-heading {
  margin: var(--tr-space-5) 0 var(--tr-space-3);
  font-size: 1.15rem;
  font-weight: 800;
}
.ways {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--tr-space-3);
}
.way {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 120px;
  padding: var(--tr-space-4);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-l);
  background: var(--ion-card-background);
  box-shadow: var(--tr-shadow-1);
  color: var(--tr-text);
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: transform var(--tr-duration-fast) ease;
}
.way:active {
  transform: scale(0.97);
}
.way svg {
  color: var(--ion-color-primary);
}
.way-title {
  color: var(--tr-text);
  font-weight: 800;
  line-height: 1.2;
}
.way-help {
  font-size: 0.8rem;
  line-height: 1.3;
  color: var(--tr-text-muted);
}
.my-sessions {
  margin-block: 16px;
}
.my-sessions h2 {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
}
.custom {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-block-end: 8px;
  padding: 10px 8px 10px 14px;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.custom-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.superset-choice {
  --background: transparent;
  --padding-start: 0;
  margin-block: 4px;
}
.toggle-title {
  display: block;
  font-weight: 600;
}
.toggle-help {
  display: block;
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
  white-space: normal;
}
.muted {
  color: var(--ion-color-medium);
}
</style>
