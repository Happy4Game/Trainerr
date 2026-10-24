<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { DEFAULT_SETTINGS, type Settings } from '@/data/repositories/settingsRepository';
import type { PauseLength } from '@/domain/comeback';
import type { ProtectedZone } from '@/domain/muscles';
import type { SportId, WeeklySlot } from '@/domain/planning';
import type { Goal, SessionMinutes } from '@/domain/sessionBuilder';
import { supersetsSuggestedFor } from '@/domain/supersets';
import { recommendModel } from '@/domain/trainingModels';
import AvailabilityGrid from '@/ui/AvailabilityGrid.vue';
import { askNotificationPermission, rescheduleNotifications } from '@/ui/notifications';
import { useSession } from '@/ui/session/useSession';
import { updateSettings } from '@/ui/useSettings';

const { t } = useI18n();
const router = useIonRouter();
const session = useSession();

// Questions 1 to 7, then the notifications screen.
const STEPS = 8;
const step = ref(0);

const goal = ref<Goal>('hypertrophy');
const sessionsPerWeek = ref(4);
const level = ref<Settings['level']>('trained');
const pause = ref<PauseLength>('overThreeMonths');
const freeSlots = ref<WeeklySlot[]>([...DEFAULT_SETTINGS.freeSlots]);
const sessionMinutes = ref<SessionMinutes>(60);
const sport = ref<SportId | 'none'>('none');
const sportSlots = ref<WeeklySlot[]>([]);
const zone = ref<ProtectedZone | 'none'>('none');

const GOALS: Goal[] = ['hypertrophy', 'maintenance', 'strength'];
const LEVELS: Settings['level'][] = ['beginner', 'trained', 'comeback'];
const PAUSES: PauseLength[] = ['underOneMonth', 'oneToThreeMonths', 'overThreeMonths'];
const DURATIONS: SessionMinutes[] = [30, 45, 60, 90];
const SPORTS: (SportId | 'none')[] = [
  'none',
  'cycling',
  'running',
  'football',
  'swimming',
  'combat',
  'other',
];
const ZONES: (ProtectedZone | 'none')[] = ['none', 'shoulders', 'knees', 'back'];

const canGoOn = computed(() => step.value !== 3 || freeSlots.value.length > 0);

function answers(): Partial<Settings> {
  return {
    goal: goal.value,
    sessionsPerWeek: sessionsPerWeek.value,
    model: recommendModel(sessionsPerWeek.value),
    level: level.value,
    ...(level.value === 'comeback'
      ? { comeback: { pause: pause.value, startedOn: new Date().toISOString().slice(0, 10) } }
      : {}),
    freeSlots: freeSlots.value,
    sessionMinutes: sessionMinutes.value,
    supersets: supersetsSuggestedFor(sessionMinutes.value),
    ...(sport.value !== 'none'
      ? { otherSport: { sport: sport.value, slots: sportSlots.value } }
      : {}),
    ...(zone.value !== 'none' ? { protectedZone: zone.value } : {}),
  };
}

async function finish(withNotifications: boolean): Promise<void> {
  const granted = withNotifications ? await askNotificationPermission() : false;
  const saved = await updateSettings({
    ...answers(),
    notifications: { ...DEFAULT_SETTINGS.notifications, enabled: granted },
    onboarded: true,
  });
  await rescheduleNotifications(saved);
  await session.reload();
  router.replace('/tabs/today');
}

/** "Passer": hypertrophy, 4 sessions, 1 h, no other sport, straight to the catalog. */
async function skip(): Promise<void> {
  await updateSettings({ onboarded: true });
  await session.reload();
  router.replace('/tabs/catalog');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('onboarding.title') }}</ion-title>
        <ion-button v-if="step < STEPS - 1" slot="end" fill="clear" @click="skip">
          {{ t('onboarding.skip') }}
        </ion-button>
      </ion-toolbar>
      <ion-progress-bar :value="(step + 1) / STEPS" />
    </ion-header>

    <ion-content class="ion-padding">
      <section v-if="step === 0">
        <h1>{{ t('onboarding.goal.question') }}</h1>
        <div class="choices">
          <ion-button
            v-for="g in GOALS"
            :key="g"
            expand="block"
            :fill="goal === g ? 'solid' : 'outline'"
            :aria-pressed="goal === g"
            @click="goal = g"
          >
            {{ t(`onboarding.goal.${g}`) }}
          </ion-button>
        </div>
      </section>

      <section v-else-if="step === 1">
        <h1>{{ t('onboarding.sessions.question') }}</h1>
        <div class="row">
          <ion-button
            v-for="count in [2, 3, 4, 5, 6]"
            :key="count"
            size="large"
            :fill="sessionsPerWeek === count ? 'solid' : 'outline'"
            :aria-pressed="sessionsPerWeek === count"
            @click="sessionsPerWeek = count"
          >
            {{ count }}
          </ion-button>
        </div>
        <p class="hint">
          {{
            t('onboarding.sessions.model', {
              model: t(`models.${recommendModel(sessionsPerWeek)}`),
            })
          }}
        </p>
      </section>

      <section v-else-if="step === 2">
        <h1>{{ t('onboarding.level.question') }}</h1>
        <div class="choices">
          <ion-button
            v-for="l in LEVELS"
            :key="l"
            expand="block"
            :fill="level === l ? 'solid' : 'outline'"
            :aria-pressed="level === l"
            @click="level = l"
          >
            {{ t(`onboarding.level.${l}`) }}
          </ion-button>
        </div>
        <template v-if="level === 'comeback'">
          <h2>{{ t('onboarding.level.pause') }}</h2>
          <div class="choices">
            <ion-button
              v-for="p in PAUSES"
              :key="p"
              expand="block"
              :fill="pause === p ? 'solid' : 'outline'"
              :aria-pressed="pause === p"
              @click="pause = p"
            >
              {{ t(`onboarding.pauses.${p}`) }}
            </ion-button>
          </div>
          <p class="hint">{{ t('onboarding.level.comebackHint') }}</p>
        </template>
      </section>

      <section v-else-if="step === 3">
        <h1>{{ t('onboarding.availability.question') }}</h1>
        <p class="hint">{{ t('onboarding.availability.hint') }}</p>
        <AvailabilityGrid v-model="freeSlots" :label="t('onboarding.availability.question')" />
      </section>

      <section v-else-if="step === 4">
        <h1>{{ t('onboarding.duration.question') }}</h1>
        <div class="choices">
          <ion-button
            v-for="d in DURATIONS"
            :key="d"
            expand="block"
            :fill="sessionMinutes === d ? 'solid' : 'outline'"
            :aria-pressed="sessionMinutes === d"
            @click="sessionMinutes = d"
          >
            {{ t(`onboarding.duration.${d}`) }}
          </ion-button>
        </div>
      </section>

      <section v-else-if="step === 5">
        <h1>{{ t('onboarding.sport.question') }}</h1>
        <div class="choices">
          <ion-button
            v-for="s in SPORTS"
            :key="s"
            expand="block"
            :fill="sport === s ? 'solid' : 'outline'"
            :aria-pressed="sport === s"
            @click="sport = s"
          >
            {{ t(`sports.${s}`) }}
          </ion-button>
        </div>
        <template v-if="sport !== 'none'">
          <h2>{{ t('onboarding.sport.when') }}</h2>
          <AvailabilityGrid v-model="sportSlots" :label="t('onboarding.sport.when')" />
        </template>
      </section>

      <section v-else-if="step === 6">
        <h1>{{ t('onboarding.zone.question') }}</h1>
        <div class="choices">
          <ion-button
            v-for="z in ZONES"
            :key="z"
            expand="block"
            :fill="zone === z ? 'solid' : 'outline'"
            :aria-pressed="zone === z"
            @click="zone = z"
          >
            {{ t(`zones.${z}`) }}
          </ion-button>
        </div>
      </section>

      <section v-else>
        <h1>{{ t('onboarding.notifications.question') }}</h1>
        <p>{{ t('onboarding.notifications.why') }}</p>
        <p class="hint">{{ t('onboarding.notifications.privacy') }}</p>
        <ion-button expand="block" size="large" @click="finish(true)">
          {{ t('onboarding.notifications.accept') }}
        </ion-button>
        <ion-button expand="block" fill="outline" @click="finish(false)">
          {{ t('onboarding.notifications.later') }}
        </ion-button>
        <p class="hint ai">{{ t('onboarding.aiNote') }}</p>
      </section>
    </ion-content>

    <ion-footer v-if="step < STEPS - 1">
      <ion-toolbar>
        <ion-button v-if="step > 0" slot="start" fill="clear" @click="step--">
          {{ t('onboarding.back') }}
        </ion-button>
        <ion-button slot="end" :disabled="!canGoOn" @click="step++">
          {{ t('onboarding.next') }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<style scoped>
h1 {
  font-size: 1.5rem;
}
h2 {
  margin-block-start: 24px;
  font-size: 1.1rem;
}
.choices ion-button {
  min-height: 52px;
  margin-block: 8px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.row ion-button {
  min-width: 56px;
}
.hint {
  color: var(--ion-color-medium);
}
.ai {
  margin-block-start: 24px;
  font-size: 0.85rem;
}
</style>
