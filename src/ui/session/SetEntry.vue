<script setup lang="ts">
import { IonButton, IonChip, IonInput, IonLabel } from '@ionic/vue';
import {
  ArrowLeftRight,
  Equal,
  Mic,
  Minus,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
  Check,
  Flame,
} from 'lucide-vue-next';
import { compareWithLastTime } from '@/domain/setComparison';
import ExerciseHistoryModal from './ExerciseHistoryModal.vue';
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  defaultStepsFor,
  parseLoad,
  snapToFineStep,
  stackBreakdown,
  stepDown,
  stepUp,
  stepUpOrBeyond,
} from '@/domain/loadSteps';
import type { Difficulty } from '@/domain/types';
import { parseVoiceSet } from '@/domain/voiceInput';
import { setAdvice, type SetAdvice } from '@/domain/setAdvice';
import { useSession } from './useSession';
import { useRirText } from './useRirText';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { createRecognition, voiceSupported } from './voice';
import { unlockSound } from './restSound';
import { useUnits } from '@/ui/useUnits';
import { useSettings } from '@/ui/useSettings';
import { DEFAULT_PLATE_CONFIG, platesFor } from '@/domain/plates';
import { DEFAULT_BODY_WEIGHT_KG } from '@/domain/assisted';

const props = defineProps<{ exerciseId: string }>();
const emit = defineEmits<{ busy: []; replace: []; plates: [loadKg: number] }>();

const { t, n, locale } = useI18n();
const session = useSession();

const entry = computed(() => session.entryOf(props.exerciseId));
const proposal = computed(() => session.proposalFor(props.exerciseId));
/** A light test set: the feeling sets the load, so each answer says what it does. */
const testSet = computed(() => proposal.value?.reason === 'testSet');
const cardLink = computed(() => `/tabs/session/exercise/${encodeURIComponent(props.exerciseId)}`);
const thumbnail = computed(() => {
  const image = illustrationFor(props.exerciseId)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
});
const steps = computed(() => (entry.value ? session.stepsOf(entry.value) : []));
const done = computed(() => session.workSetsInSession(props.exerciseId).length);
/** "Not in shape today": one set less per exercise, no load increase. */
const tired = computed(() => session.active.value?.plan.tired === true);
/** Before the first work set, unless the app's own warm-up card is shown. */
const ownWarmup = computed(() => done.value === 0 && !session.warmup.value);
/** Warm-up sets already done on this machine: after one, the fields go back to the work set. */
const warmupsDone = computed(
  () =>
    (session.active.value?.sets ?? []).filter((s) => s.exerciseId === props.exerciseId && s.warmup)
      .length,
);
/** Before the first set: the very close machines, one tap away (same main muscle, same kind). */
const closeOnes = computed(() =>
  done.value === 0 ? session.replacements(props.exerciseId).slice(0, 3) : [],
);
const closeName = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const target = computed(() => session.plannedSets(props.exerciseId));

const load = ref(0);
const reps = ref(0);
const incomplete = ref(false);
const slowTempo = ref(false);
/** Optional: reps left in the tank (0 to 4+), and a free note on the set. */
const rir = ref<number>();
const setNote = ref('');
const heard = ref<Difficulty>();
const listening = ref(false);

// Pre-filled with the proposal: the user only corrects what changed.
watch(
  [() => props.exerciseId, done, warmupsDone, proposal],
  () => {
    if (!proposal.value) return;
    load.value = proposal.value.loadKg;
    reps.value = proposal.value.targetReps;
    incomplete.value = false;
    slowTempo.value = false;
    rir.value = undefined;
    setNote.value = '';
    heard.value = undefined;
  },
  { immediate: true },
);

const partnerName = computed(() => {
  const id = session.supersetPartner(props.exerciseId);
  const e = id ? session.entryOf(id)?.exercise : undefined;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : undefined;
});
const name = computed(() =>
  entry.value
    ? locale.value.startsWith('fr')
      ? entry.value.exercise.name
      : entry.value.exercise.nameEn
    : '',
);
const { load: kg, fromInput, toDisplay, symbol } = useUnits();
const { settings: appSettings } = useSettings();

// A load between two steps (e.g. 52.5 kg with an add-on) can be typed: tap the value.
const typing = ref(false);
const typed = ref('');
const loadInput = ref<InstanceType<typeof IonInput>>();
async function startTyping(): Promise<void> {
  typed.value = n(toDisplay(load.value));
  typing.value = true;
  await nextTick();
  await loadInput.value?.$el.setFocus();
}
function applyTyped(): void {
  if (!typing.value) return;
  typing.value = false;
  const value = parseLoad(typed.value);
  if (value !== undefined)
    load.value = snapToFineStep(fromInput(value), entry.value?.setup.fineStepKg);
}
/** "Plate 45 kg + 2.5 kg": what to set on the machine when add-ons are used. */
const breakdown = computed(() => {
  const e = entry.value;
  const addOns = e?.setup.addOnsKg ?? [];
  if (!e || addOns.length === 0) return undefined;
  const plates = e.loadSteps.length > 0 ? e.loadSteps : defaultStepsFor(e.exercise.equipment);
  const found = stackBreakdown(load.value, plates, addOns);
  return found && found.addOnsKg.length > 0 ? found : undefined;
});
/** On a barbell, the plates to put on each side, without opening the calculator. */
const platesPerSide = computed(() => {
  if (entry.value?.exercise.equipment !== 'barbell') return undefined;
  const result = platesFor(load.value, appSettings.value?.barbell ?? DEFAULT_PLATE_CONFIG);
  if (!result.exact) return undefined;
  return result.loading.perSide.length === 0
    ? t('session.plates.barOnly')
    : t('session.plates.perSideLine', {
        plates: result.loading.perSide.map((p) => n(toDisplay(p))).join(' + '),
        unit: symbol.value,
      });
});
/** Seat and notch noted on the machine card, recalled at each set. */
const setupText = computed(() => {
  const setup = entry.value?.setup;
  const parts = [
    setup?.seat ? t('session.setup.seat', { value: setup.seat }) : undefined,
    setup?.notch ? t('session.setup.notch', { value: setup.notch }) : undefined,
  ].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(' · ') : undefined;
});

function lighter(): void {
  load.value = stepDown(steps.value, load.value) ?? load.value;
}
function heavier(): void {
  load.value = stepUpOrBeyond(steps.value, load.value);
}
function changeReps(delta: number): void {
  reps.value = Math.max(0, reps.value + delta);
}

// Last session with this exercise, and the advice for this set compared with the previous one.
const previousToday = computed(() => session.workSetsInSession(props.exerciseId).at(-1));
/** Help lines for the first two sessions only: then the screen stays short. */
const learning = computed(() => session.history.value.length < 2);
const lastTime = computed(() => session.lastTimeSets(props.exerciseId));
const usual = computed(() =>
  session.references.value.find((r) => r.exerciseId === props.exerciseId),
);
/** Assisted machine: the load is the help, less help is progress. */
const assisted = computed(() => entry.value?.exercise.assisted === true);
/** Body weight exercise (plank, back extension): 0 kg reads "body weight", extra load "+ 5 kg". */
const bodyweight = computed(() => entry.value?.exercise.equipment === 'bodyweight');
const loadText = (loadKg: number) =>
  bodyweight.value
    ? loadKg === 0
      ? t('session.bodyweight.none')
      : t('session.bodyweight.extra', { load: kg(loadKg) })
    : kg(loadKg);
/** Seconds held for a plank, reps otherwise. */
const repsText = (reps: number) =>
  timed.value ? t('presets.seconds', { reps: n(reps) }) : n(reps);
const setText = (set: { loadKg: number; reps: number }) =>
  assisted.value
    ? t('session.assisted.set', { load: kg(set.loadKg), reps: n(set.reps) })
    : `${loadText(set.loadKg)} × ${repsText(set.reps)}`;
const real = (set: { loadKg: number; reps: number }) => ({
  ...set,
  loadKg: session.realLoadFor(props.exerciseId, set.loadKg),
});
// Compared on the real load: on an assisted machine, less help shows as "more load".
const advice = computed<SetAdvice>(() => {
  if (!proposal.value) return 'first';
  const previous = session.previousFor(props.exerciseId);
  return setAdvice(
    { ...proposal.value, loadKg: real({ loadKg: proposal.value.loadKg, reps: 0 }).loadKg },
    previous && real(previous),
  );
});
const realLoad = computed(() => session.realLoadFor(props.exerciseId, load.value));
/** Record to beat, on the real load (body weight − help on an assisted machine). */
const record = computed(() => session.recordFor(props.exerciseId));

/** Ready-made session lines: a plank is held for seconds, lunges count per leg. */
const timed = computed(() => session.planned(props.exerciseId)?.timed === true);
/**
 * Double progression made visible: every set at the top of the range, and
 * the load goes up next time (less help on an assisted machine).
 */
const goal = computed(() => {
  const p = proposal.value;
  const range = session.repRangeOf(props.exerciseId);
  if (!p || !range || timed.value || p.reason === 'testSet') return undefined;
  const next = assisted.value ? stepDown(steps.value, p.loadKg) : stepUp(steps.value, p.loadKg);
  if (next === undefined) return undefined;
  const label = (kgValue: number) =>
    assisted.value ? t('session.assisted.load', { load: kg(kgValue) }) : loadText(kgValue);
  return t('session.coach.goal', { reps: n(range.max), load: label(p.loadKg), next: label(next) });
});
const perSide = computed(() => session.planned(props.exerciseId)?.perSide === true);
const ADVICE_ICON: Record<SetAdvice, string> = {
  moreLoad: '↑',
  moreReps: '↗',
  same: '=',
  lighter: '↓',
  first: '★',
  comeback: '↺',
};

const RIR_VALUES = [0, 1, 2, 3, 4] as const;

/** Last session next to today, set by set (real load: less help counts as heavier). */
const lastDate = computed(() => session.lastTimeDate(props.exerciseId));
/** The session before last time, to see two sessions back (shown when it has work sets). */
const timeBefore = computed(() => {
  const before = session.lastTimes(props.exerciseId)[1];
  return before && before.sets.length > 0 ? before : undefined;
});
/** Every past session with work sets on this exercise, newest first. */
const allTimes = computed(() =>
  session.lastTimes(props.exerciseId, Infinity).filter((past) => past.sets.length > 0),
);
const historyOpen = ref(false);
const comparison = computed(() => {
  const rows = compareWithLastTime(
    lastTime.value,
    session.workSetsInSession(props.exerciseId),
    // Enough rows for every set of the session before last time too.
    Math.max(target.value, timeBefore.value?.sets.length ?? 0),
  );
  // Trend on the real load, shown sets stay as typed on the machine.
  return rows.map((row) =>
    row.before && row.now
      ? {
          ...row,
          trend: compareWithLastTime([real(row.before)], [real(row.now)])[0]?.trend,
        }
      : row,
  );
});
const TREND_ICON = { up: TrendingUp, same: Equal, down: TrendingDown } as const;
const shortDay = (date: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

/** The rest a set starts, set by the exercise only: seen before the tap. */
const rirText = useRirText();
const restPreview = computed(() => session.restPreview(props.exerciseId));
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Like a coach: the reps done drive the load (double progression, ACSM 2009,
 * doi:10.1249/MSS.0b013e3181915670). Above the range the load goes up, below
 * it goes down. Only the test set asks if it was too light.
 */
async function validate(difficulty: Difficulty = heard.value ?? 'ok'): Promise<void> {
  // A short buzz: the set is saved, no need to look at the screen.
  navigator.vibrate?.(35);
  // This tap allows the beep at the end of the rest.
  unlockSound();
  await session.logSet({
    exerciseId: props.exerciseId,
    loadKg: load.value,
    reps: reps.value,
    difficulty,
    ...(incomplete.value ? { completeReps: false } : {}),
    ...(slowTempo.value ? { slowTempo: true } : {}),
    ...(rir.value === undefined ? {} : { rir: rir.value }),
    ...(setNote.value.trim() ? { note: setNote.value.trim() } : {}),
  });
  // A record: a happier buzz.
  if (session.lastSetBeatRecord.value) navigator.vibrate?.([60, 40, 60, 40, 160]);
}

/**
 * A warm-up set done on the work machine itself, at the load and reps shown:
 * kept in the session, but it neither counts as a planned set nor moves the
 * load, the records or the progress charts.
 */
async function logOwnWarmup(): Promise<void> {
  navigator.vibrate?.(35);
  await session.logSet({
    exerciseId: props.exerciseId,
    loadKg: load.value,
    reps: reps.value,
    difficulty: 'easy',
    warmup: true,
  });
}

function listen(): void {
  const recognition = createRecognition(locale.value);
  if (!recognition) return;
  listening.value = true;
  recognition.onresult = (event) => {
    const heardSet = parseVoiceSet(event.results[0]?.[0]?.transcript ?? '');
    // Spoken numbers are in the user's unit.
    if (heardSet.loadKg !== undefined) load.value = fromInput(heardSet.loadKg);
    if (heardSet.reps !== undefined) reps.value = heardSet.reps;
    heard.value = heardSet.difficulty;
  };
  recognition.onend = () => (listening.value = false);
  recognition.start();
}
</script>

<template>
  <section v-if="entry && proposal" class="entry" :aria-label="name">
    <div class="head-row">
      <router-link :to="cardLink" class="header" :aria-label="t('session.seeCard', { name })">
        <img v-if="thumbnail" :src="thumbnail" alt="" class="thumb" />
        <span class="title">
          <h2>{{ name }}</h2>
          <span class="hint">{{ t('session.seeMovement') }} ›</span>
        </span>
      </router-link>
      <!-- Always at hand, next to the name: the machine is taken, broken, or not right. -->
      <button
        type="button"
        class="switch"
        :aria-label="t('session.replaceCard.open')"
        @click="emit('replace')"
      >
        <ArrowLeftRight :size="22" aria-hidden="true" />
        <span>{{ t('session.replaceCard.short') }}</span>
      </button>
    </div>

    <div
      v-if="closeOnes.length > 0"
      class="close-ones"
      role="group"
      :aria-label="t('session.closeOnes.title')"
    >
      <span class="close-title">{{ t('session.closeOnes.title') }}</span>
      <ion-chip
        v-for="alt in closeOnes"
        :key="alt.id"
        :aria-label="t('session.closeOnes.take', { name: closeName(alt.id) })"
        @click="session.replaceExercise(exerciseId, alt.id)"
      >
        {{ closeName(alt.id) }}
      </ion-chip>
    </div>

    <!-- "Not in shape" chosen at the start: said again here, where the sets are counted. -->
    <div v-if="tired" class="tired-note" data-testid="tired-note">
      <p>{{ t('session.tired.reminder') }}</p>
      <ion-button size="small" fill="outline" @click="session.backInShape()">
        {{ t('session.tired.better') }}
      </ion-button>
    </div>
    <div class="set-number">
      <strong>{{
        t('session.setNumber', { current: Math.min(done + 1, target), total: target })
      }}</strong>
      <ion-button
        v-if="session.canAddSet(exerciseId)"
        size="small"
        fill="outline"
        class="extra-set"
        :aria-label="t('session.extraSet.label')"
        @click="session.extraSet(exerciseId)"
      >
        {{ t('session.extraSet.short') }}
      </ion-button>
      <ion-button
        v-if="session.canRemoveSet(exerciseId)"
        size="small"
        fill="outline"
        color="medium"
        class="extra-set"
        :aria-label="t('session.fewerSets.label')"
        @click="session.removePlannedSet(exerciseId)"
      >
        {{ t('session.fewerSets.short') }}
      </ion-button>
    </div>
    <p v-if="record" class="record" data-testid="record">
      <span aria-hidden="true">🏆</span>
      <span>{{
        t('session.record.toBeat', {
          set: `${kg(record.bestLoad.loadKg)} × ${n(record.bestLoad.reps)}`,
          oneRepMax: kg(Math.round(record.bestOneRepMax.value)),
        })
      }}</span>
    </p>
    <div v-if="partnerName" class="superset" role="note">
      <span>
        <strong>{{
          t('session.supersetPlace', { place: session.supersetPlace(exerciseId) })
        }}</strong>
        {{
          session.supersetPlace(exerciseId) === 1
            ? t('session.supersetThen', { name: partnerName })
            : t('session.supersetLast', { name: partnerName })
        }}
      </span>
      <ion-button
        size="small"
        fill="outline"
        color="light"
        :aria-label="t('session.splitNamed', { name: partnerName })"
        @click="session.splitSuperset(exerciseId)"
      >
        {{ t('session.split') }}
      </ion-button>
    </div>

    <!-- Set by set: last session against today -->
    <table v-if="lastTime.length > 0" class="compare" :aria-label="t('session.compare.title')">
      <thead>
        <tr>
          <th scope="col">{{ t('session.compare.set') }}</th>
          <th v-if="timeBefore" scope="col" class="older">
            {{ t('session.compare.timeBefore') }}
            <small>{{ shortDay(timeBefore.date) }}</small>
          </th>
          <th scope="col">
            {{ t('session.compare.before') }}
            <small v-if="lastDate">{{ shortDay(lastDate) }}</small>
          </th>
          <th scope="col">{{ t('session.compare.today') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in comparison"
          :key="row.number"
          :class="{ current: row.number === done + 1 }"
          :data-testid="`compare-${row.number}`"
        >
          <th scope="row">{{ row.number }}</th>
          <td v-if="timeBefore" class="older">
            {{ timeBefore.sets[row.number - 1] ? setText(timeBefore.sets[row.number - 1]!) : '—' }}
          </td>
          <td>{{ row.before ? setText(row.before) : '—' }}</td>
          <td>
            <template v-if="row.now">
              {{ setText(row.now) }}
              <component
                :is="TREND_ICON[row.trend ?? 'same']"
                v-if="row.trend"
                :size="15"
                :class="['trend', row.trend]"
                :aria-label="t(`session.compare.trend.${row.trend}`)"
              />
            </template>
            <span v-else-if="row.number === done + 1" class="now">{{
              t('session.compare.now')
            }}</span>
            <span v-else class="todo">·</span>
          </td>
        </tr>
      </tbody>
    </table>
    <ion-button
      v-if="allTimes.length > 0"
      fill="clear"
      size="small"
      class="all-history"
      data-testid="all-history"
      @click="historyOpen = true"
    >
      {{ t('session.history.open', allTimes.length) }} ›
    </ion-button>
    <ExerciseHistoryModal
      :open="historyOpen"
      :name="name"
      :sessions="allTimes"
      :set-text="setText"
      @close="historyOpen = false"
    />

    <!-- What was done before, and what to do now -->
    <div class="coach" :class="advice" role="note">
      <!-- The table above already shows last time and today's sets. -->
      <template v-if="lastTime.length > 0" />
      <p v-else-if="previousToday" class="before">
        {{
          t('session.coach.previousSet', {
            set: setText(previousToday),
          })
        }}
      </p>
      <p v-else-if="usual" class="before">
        {{ t('session.coach.usual', { set: setText(usual) }) }}
      </p>
      <p v-else class="before">{{ t('session.coach.noHistory') }}</p>
      <p class="advice">
        <span class="arrow" aria-hidden="true">{{ ADVICE_ICON[advice] }}</span>
        {{
          t(`session.coach.${assisted ? 'assistedAdvice' : 'advice'}.${advice}`, {
            load: loadText(proposal.loadKg),
            reps: repsText(proposal.targetReps),
          })
        }}
      </p>
      <p class="why">{{ t(`session.reason.${proposal.reason}`) }}</p>
      <p v-if="goal" class="goal" data-testid="goal">🎯 {{ goal }}</p>
    </div>
    <p v-if="proposal.reminders.includes('rangeOfMotion')" class="reminder" role="note">
      {{ t('session.reminder.rangeOfMotion') }}
    </p>
    <p v-if="proposal.reminders.includes('technique')" class="reminder" role="note">
      {{ t('session.reminder.technique') }}
    </p>

    <p v-if="setupText" class="setup" data-testid="machine-setup">
      {{ t('session.setup.label', { setup: setupText }) }}
    </p>

    <h3 class="step"><span class="badge">1</span> {{ t('session.steps.do') }}</h3>
    <p v-if="learning" class="help">{{ t('session.steps.doHelp') }}</p>
    <div class="stepper">
      <span class="stepper-label">{{
        assisted
          ? t('session.assisted.help')
          : bodyweight
            ? t('session.bodyweight.label')
            : t('session.load')
      }}</span>
      <ion-button
        class="step-button"
        fill="clear"
        :aria-label="assisted ? t('session.assisted.lessHelp') : t('session.lighter')"
        @click="lighter"
      >
        <Minus :size="26" aria-hidden="true" />
      </ion-button>
      <ion-input
        v-if="typing"
        ref="loadInput"
        v-model="typed"
        class="value-input"
        inputmode="decimal"
        enterkeyhint="done"
        :aria-label="t('session.typeLoad')"
        @keyup.enter="applyTyped"
        @ion-blur="applyTyped"
      />
      <button
        v-else
        type="button"
        class="value-button"
        :aria-label="t('session.typeLoadNamed', { load: kg(load) })"
        @click="startTyping"
      >
        <output class="value" data-testid="load">
          <template v-if="bodyweight && load === 0">{{ t('session.bodyweight.short') }}</template>
          <template v-else
            >{{ n(toDisplay(load)) }}<span class="unit">&nbsp;{{ symbol }}</span></template
          >
        </output>
        <Pencil :size="14" aria-hidden="true" class="edit-hint" />
      </button>
      <ion-button
        class="step-button"
        fill="clear"
        :aria-label="assisted ? t('session.assisted.moreHelp') : t('session.heavier')"
        @click="heavier"
      >
        <Plus :size="26" aria-hidden="true" />
      </ion-button>
    </div>
    <p v-if="assisted" class="breakdown" data-testid="real-load">
      {{
        t('session.assisted.real', {
          real: kg(realLoad),
          weight: kg(session.bodyWeight.value ?? DEFAULT_BODY_WEIGHT_KG),
          help: kg(load),
        })
      }}
      <router-link v-if="session.bodyWeight.value === undefined" to="/tabs/settings">
        {{ t('session.assisted.noWeight') }}
      </router-link>
    </p>
    <p v-if="platesPerSide" class="breakdown" data-testid="per-side">{{ platesPerSide }}</p>
    <p v-if="breakdown" class="breakdown" data-testid="breakdown">
      {{
        t('session.breakdown', {
          plate: kg(breakdown.plateKg),
          addOns: breakdown.addOnsKg.map(kg).join(' + '),
        })
      }}
    </p>
    <div class="stepper">
      <span class="stepper-label">{{
        timed ? t('session.seconds') : perSide ? t('session.repsPerSide') : t('session.reps')
      }}</span>
      <ion-button
        v-if="!timed"
        class="half"
        size="small"
        fill="clear"
        :aria-label="t('session.halfRep')"
        @click="changeReps(0.5)"
      >
        +½
      </ion-button>
      <ion-button
        class="step-button"
        fill="clear"
        :aria-label="timed ? t('session.fewerSeconds') : t('session.fewerReps')"
        @click="changeReps(timed ? -5 : -1)"
      >
        <Minus :size="26" aria-hidden="true" />
      </ion-button>
      <output class="value" data-testid="reps">{{ n(reps) }}</output>
      <ion-button
        class="step-button"
        fill="clear"
        :aria-label="timed ? t('session.moreSeconds') : t('session.moreReps')"
        @click="changeReps(timed ? 5 : 1)"
      >
        <Plus :size="26" aria-hidden="true" />
      </ion-button>
    </div>

    <h3 class="step">
      <span class="badge">2</span>
      {{ testSet ? t('session.testSetQuestion') : t('session.validate.title') }}
    </h3>
    <p v-if="testSet" class="help test-help">{{ t('session.testSetFeel') }}</p>
    <p v-else-if="learning" class="help">{{ t('session.steps.feelHelp') }}</p>
    <div v-if="testSet" class="test-answers">
      <ion-button color="success" size="large" @click="validate('easy')">
        {{ t('session.validate.tooLight') }}
      </ion-button>
      <ion-button size="large" @click="validate('ok')">
        {{ t('session.validate.fine') }}
      </ion-button>
    </div>
    <div v-else class="done-row">
      <ion-button class="done-button" size="large" @click="validate()">
        <Check :size="26" aria-hidden="true" class="icon" />
        {{ t('session.validate.done') }}
      </ion-button>
      <!-- Stopped well before failure: the load goes up from the next set. -->
      <ion-button class="light-button" fill="outline" color="success" @click="validate('easy')">
        {{ t('session.validate.light') }}
      </ion-button>
    </div>
    <!-- A warm-up of one's own on the work machine: saved, but not one of the planned sets.
         Hidden while the app proposes its own warm-up set, which has its card above. -->
    <ion-button
      v-if="ownWarmup"
      class="warmup-button"
      expand="block"
      fill="clear"
      color="medium"
      @click="logOwnWarmup"
    >
      <Flame :size="18" aria-hidden="true" class="icon" />
      {{ t('session.ownWarmup.log') }}
    </ion-button>
    <p v-if="ownWarmup && learning" class="help">{{ t('session.ownWarmup.help') }}</p>
    <p v-if="restPreview" class="rest-line" data-testid="rest-preview">
      {{ t('session.reserve.rest', { time: clock(restPreview) }) }}
    </p>

    <details class="more">
      <summary>{{ t('session.moreOptions') }}</summary>
      <div class="flags">
        <ion-chip
          :outline="!incomplete"
          v-bind="incomplete ? { color: 'warning' } : {}"
          role="switch"
          :aria-checked="incomplete"
          @click="incomplete = !incomplete"
        >
          <ion-label>{{ t('session.incomplete') }}</ion-label>
        </ion-chip>
        <ion-chip
          :outline="!slowTempo"
          v-bind="slowTempo ? { color: 'tertiary' } : {}"
          role="switch"
          :aria-checked="slowTempo"
          @click="slowTempo = !slowTempo"
        >
          <ion-label>{{ t('session.slowTempo') }}</ion-label>
        </ion-chip>
      </div>
      <fieldset class="rir">
        <legend>{{ t('session.rir.label') }}</legend>
        <ion-chip
          v-for="value in RIR_VALUES"
          :key="value"
          :outline="rir !== value"
          v-bind="rir === value ? { color: 'primary' } : {}"
          role="radio"
          :aria-checked="rir === value"
          :aria-label="rirText(value)"
          @click="rir = rir === value ? undefined : value"
        >
          <ion-label>{{ value === 4 ? '4+' : value }}</ion-label>
        </ion-chip>
      </fieldset>
      <p class="help">{{ t('session.rir.help') }}</p>
      <ion-input
        v-model="setNote"
        class="set-note"
        fill="outline"
        :label="t('session.setNote.label')"
        label-placement="stacked"
        :placeholder="t('session.setNote.placeholder')"
        :maxlength="120"
      />
      <ion-button
        v-if="voiceSupported()"
        fill="outline"
        color="medium"
        :disabled="listening"
        @click="listen"
      >
        <Mic :size="18" aria-hidden="true" class="icon" />
        {{ listening ? t('session.voice.listening') : t('session.voice.start') }}
      </ion-button>
    </details>

    <div class="tools">
      <ion-button fill="outline" color="medium" @click="emit('busy')">
        {{ t('session.busy') }}
      </ion-button>
      <ion-button
        v-if="entry.exercise.equipment === 'barbell'"
        fill="outline"
        color="medium"
        @click="emit('plates', load)"
      >
        {{ t('session.plates.open') }}
      </ion-button>
    </div>
  </section>
</template>

<style scoped>
.set-note {
  margin: 8px 0;
}

.extra-set {
  margin-inline: 4px;
  --padding-start: 8px;
  --padding-end: 8px;
  text-transform: none;
}
.close-ones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 4px;
  margin-block: 4px;
}
.close-title {
  flex-basis: 100%;
  color: var(--tr-text-muted);
  font-size: 0.85rem;
}
.head-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.head-row .header {
  flex: 1;
  min-width: 0;
}
.switch {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 64px;
  min-height: 64px;
  padding: 6px 8px;
  border: 1px solid var(--ion-color-primary);
  border-radius: var(--tr-radius-l, 16px);
  background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent);
  color: var(--ion-color-primary);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 800;
}
.switch:active {
  background: color-mix(in srgb, var(--ion-color-primary) 24%, transparent);
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  color: inherit;
  text-decoration: none;
}
.header h2 {
  margin: 0;
}
.thumb {
  flex: none;
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 8px;
  /* Black-on-white drawing: white card in the dark theme too. */
  background: #fff;
}
.hint {
  font-size: 0.85rem;
  color: var(--ion-color-primary);
}
h2 {
  margin-block: 0 4px;
  font-size: 1.4rem;
  font-weight: var(--tr-weight-black);
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.tired-note {
  margin-block: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--ion-color-light);
  font-size: 0.9rem;
}
.tired-note p {
  margin: 0 0 4px;
}
.set-number {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 8px;
  font-size: 1.1rem;
}
.record {
  /* Le trophée reste sur la ligne du texte, même quand le texte passe à la ligne. */
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin-block: 0 8px;
  padding: 6px 14px;
  border-radius: var(--tr-radius-m);
  background: rgba(var(--ion-color-warning-rgb), 0.16);
  color: var(--ion-text-color);
  font-size: 0.9rem;
  font-weight: 600;
}
.coach {
  margin-block: 8px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border-inline-start: 6px solid var(--ion-color-medium);
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
}
.coach.moreLoad,
.coach.moreReps {
  border-inline-start-color: var(--ion-color-success);
}
.coach.lighter {
  border-inline-start-color: var(--ion-color-warning);
}
.coach.first,
.coach.comeback {
  border-inline-start-color: var(--ion-color-primary);
}
.coach p {
  margin: 0;
}
.before,
.why {
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}
.coach .advice {
  margin-block: 4px;
  font-size: 1.15rem;
  font-weight: 700;
}
.arrow {
  display: inline-block;
  width: 1.4em;
  text-align: center;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 16px 0;
  font-size: 1.05rem;
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 0.9rem;
}
.help {
  margin-block: 2px 6px;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.goal {
  margin-block: 6px 0;
  font-size: 0.9rem;
  font-weight: 600;
}
.test-help {
  color: var(--tr-text);
  font-weight: 600;
}
.rir {
  border: 0;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.rir legend {
  font-weight: 600;
  margin-bottom: 4px;
}
.rir ion-chip {
  min-width: 48px;
  min-height: 48px;
  justify-content: center;
}
.done-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.light-button {
  margin: 0;
  min-height: 64px;
  white-space: normal;
  font-weight: 700;
}
.done-button {
  min-height: 64px;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}
.test-answers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.test-answers ion-button {
  margin: 0;
  min-height: 64px;
  white-space: normal;
}
.compare {
  width: 100%;
  margin-block: 8px 12px;
  border-collapse: collapse;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}
.compare th,
.compare td {
  padding: 4px 6px;
  text-align: start;
}
.compare thead th {
  color: var(--ion-color-medium);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}
.compare thead small {
  font-weight: 400;
  text-transform: none;
}
.compare tbody th {
  width: 2.5em;
  color: var(--ion-color-medium);
}
.compare tbody tr {
  border-top: 1px solid var(--ion-color-step-150, rgb(128 128 128 / 20%));
}
.compare tr.current {
  background: rgb(var(--ion-color-primary-rgb) / 12%);
}
.compare td {
  white-space: nowrap;
}
.all-history {
  margin: -4px 0 8px;
  --padding-start: 0;
}
/* Two sessions back: there for the trend, quieter than last time. */
.compare td.older {
  color: var(--ion-color-medium);
}
.trend {
  vertical-align: -2px;
  margin-inline-start: 4px;
}
.trend.up {
  color: var(--ion-color-success);
}
.trend.same {
  color: var(--ion-color-medium);
}
.trend.down {
  color: var(--ion-color-danger);
}
.now {
  color: var(--ion-color-primary);
  font-weight: 700;
}
.todo {
  color: var(--ion-color-medium);
}
.rest-line {
  margin: 8px 0 0;
  text-align: center;
  color: var(--ion-color-medium-shade);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.more {
  margin-block-start: 12px;
}
.more summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--ion-color-primary);
}
.superset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-block: 6px;
  padding: 8px 10px;
  border-radius: var(--app-radius-small);
  background: var(--ion-color-tertiary);
  color: var(--ion-color-tertiary-contrast);
}
.superset ion-button {
  margin: 0;
}
.reminder {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.stepper {
  /* Une carte par réglage : libellé en haut, puis − valeur +. Les deux cartes
     ont la même grille, les boutons restent alignés d'une carte à l'autre. */
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) 60px;
  align-items: center;
  gap: 6px 8px;
  margin-block: 10px;
  padding: 10px 12px 12px;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-l);
  background: var(--tr-surface);
}
.stepper-label {
  grid-column: 1 / 3;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tr-text-muted);
}
.stepper ion-button {
  margin: 0;
}
/* − valeur + toujours sur la 2e ligne, même sans le « +½ » en haut à droite. */
.stepper > .step-button,
.stepper > .value-button,
.stepper > .value,
.stepper > .value-input {
  grid-row: 2;
}
.step-button {
  --border-radius: 50%;
  --padding-start: 0;
  --padding-end: 0;
  --background: color-mix(in srgb, var(--ion-color-primary) 16%, transparent);
  --background-activated: color-mix(in srgb, var(--ion-color-primary) 30%, transparent);
  --color: var(--ion-color-primary);
  width: 60px;
  height: 60px;
}
.stepper ion-button.half {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  --padding-start: 10px;
  --padding-end: 10px;
  --border-radius: var(--tr-radius-pill);
  --background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent);
  --color: var(--ion-color-primary);
  height: 32px;
  font-weight: 800;
}
.value-button {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 60px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--tr-radius-m);
  background: transparent;
  color: inherit;
  font: inherit;
}
.value-button:active {
  background: var(--tr-surface-2);
}
.edit-hint {
  flex: none;
  color: var(--tr-text-muted);
}
.unit {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--tr-text-muted);
}
.value-input {
  max-width: 7ch;
  font-size: 2rem;
  font-weight: 800;
  text-align: center;
}
.breakdown,
.setup {
  margin-block: 2px 6px;
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}
.setup {
  font-weight: 600;
  color: var(--ion-text-color);
}
.value {
  min-width: 0;
  font-size: 2.4rem;
  line-height: 1.1;
  font-weight: var(--tr-weight-black);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  text-align: center;
}
.flags {
  display: flex;
  flex-wrap: wrap;
}
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-block-start: 12px;
}
.icon {
  margin-inline-end: 6px;
}
</style>
