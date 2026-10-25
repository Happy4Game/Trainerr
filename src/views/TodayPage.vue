<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Settings } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import { listBadges, type EarnedBadge } from '@/data/repositories/badgeRepository';
import { useI18n } from 'vue-i18n';
import { weeksOnPace } from '@/domain/stats';
import AdviceCard from '@/ui/AdviceCard.vue';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { useSession } from '@/ui/session/useSession';
import { todayIso, useWeekPlan } from '@/ui/useWeekPlan';

const { t } = useI18n();
const session = useSession();
const { settings, days } = useWeekPlan();
const { phase, template, active, history, preview } = session;

/** The machines of the next session, as small drawings: the session at a glance. */
const planIds = computed(() =>
  active.value
    ? active.value.plan.exercises.map((e) => e.exerciseId)
    : preview.value.map((e) => e.id),
);
const planCount = computed(() => planIds.value.length);
const thumbnails = computed(() =>
  planIds.value
    .map((id) => illustrationFor(id)?.images[0])
    .filter((image) => image !== undefined)
    .slice(0, 6)
    .map((image) => `${import.meta.env.BASE_URL}exercise-images/${image.file}`),
);

const badges = ref<EarnedBadge[]>([]);
async function loadBadges(): Promise<void> {
  const { db } = await openAppDatabase();
  badges.value = await listBadges(db);
}
onMounted(loadBadges);
watch(history, loadBadges);

const today = computed(() => days.value.find((d) => d.date === todayIso()));
const doneThisWeek = computed(
  () =>
    new Set(
      history.value.map((s) => s.date).filter((date) => days.value.some((d) => d.date === date)),
    ).size,
);
const streak = computed(() =>
  settings.value
    ? weeksOnPace(history.value, settings.value.sessionsPerWeek, todayIso())
    : undefined,
);
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.today') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/settings" :aria-label="t('settings.title')">
            <Settings :size="24" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="phase === 'loading'" role="status">{{ t('catalog.loading') }}</p>
      <template v-else>
        <section class="hero" :aria-label="t('today.next')">
          <p class="eyebrow">
            {{
              active
                ? t('today.inProgressShort')
                : today?.session
                  ? t('today.plannedAt', { start: today.session.start })
                  : t('today.noPlan')
            }}
          </p>
          <h2 v-if="active">{{ t(`templates.${active.templateId}`) }}</h2>
          <h2 v-else-if="template">{{ t(`templates.${template.id}`) }}</h2>
          <p v-if="!active && !today?.session" class="hint">{{ t('today.restDay') }}</p>
          <div v-if="thumbnails.length > 0" class="thumbs" aria-hidden="true">
            <img v-for="src in thumbnails" :key="src" :src="src" alt="" />
          </div>
          <p v-if="planCount > 0" class="hint">{{ t('today.exercises', planCount) }}</p>
          <ion-button expand="block" size="large" router-link="/tabs/session">
            {{ active ? t('today.resume') : t('today.go') }}
          </ion-button>
        </section>

        <ion-card v-if="settings">
          <ion-card-header>
            <ion-card-title>{{ t('today.week') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="week-count">
              <strong>{{ doneThisWeek }}</strong> / {{ settings.sessionsPerWeek }}
              <span>{{ t('today.weekSessions', settings.sessionsPerWeek) }}</span>
            </p>
            <div
              class="week-bar"
              role="progressbar"
              :aria-valuenow="doneThisWeek"
              aria-valuemin="0"
              :aria-valuemax="settings.sessionsPerWeek"
              :aria-label="
                t('today.weekCount', { done: doneThisWeek, target: settings.sessionsPerWeek })
              "
            >
              <span
                v-for="i in settings.sessionsPerWeek"
                :key="i"
                :class="{ filled: i <= doneThisWeek }"
              />
            </div>
            <p v-if="streak && streak.current > 0" class="streak">
              🔥 {{ t('today.streak', streak.current) }}
            </p>
            <p v-if="badges.length > 0" class="badges">
              <span v-for="badge in badges" :key="badge.code" class="badge">
                <span aria-hidden="true">🏅</span> {{ t(`badges.${badge.code}`) }}
              </span>
            </p>
            <ion-button fill="clear" router-link="/tabs/planning">{{
              t('today.seePlanning')
            }}</ion-button>
          </ion-card-content>
        </ion-card>

        <AdviceCard />
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.hero {
  margin-block-end: 16px;
  padding: 20px;
  border-radius: var(--app-radius);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.hero h2 {
  margin: 2px 0 6px;
  font-size: 1.6rem;
  font-weight: 800;
}
.eyebrow {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.85;
}
.hint {
  margin: 4px 0 10px;
  opacity: 0.85;
}
.thumbs {
  display: flex;
  gap: 6px;
  margin-block: 10px 4px;
}
.thumbs img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 10px;
  background: #fff;
}
.hero ion-button {
  --background: var(--ion-color-primary-contrast);
  --color: var(--ion-color-primary);
  margin-block-start: 12px;
}
.week-count {
  margin: 0 0 8px;
  font-size: 1rem;
}
.week-count strong {
  font-size: 1.8rem;
}
.week-bar {
  display: flex;
  gap: 6px;
}
.week-bar span {
  flex: 1;
  height: 12px;
  border-radius: 6px;
  background: var(--ion-color-light);
}
.week-bar span.filled {
  background: var(--ion-color-success);
}
.streak {
  margin-block: 12px 0;
  font-weight: 600;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block: 8px;
}
.badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-size: 0.85rem;
}
</style>
