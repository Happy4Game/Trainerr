import { sessionMinutes, volumeGainPercent, workload } from '@/domain/sessionPreview';
import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import type { SqlDatabase } from '@/data/sqlite/database';
import type { CatalogExercise } from '@/data/catalog/catalog';
import type { CatalogEntry } from '@/data/repositories/catalogRepository';
import {
  abandonSession,
  addSet,
  deleteSet,
  moveSets,
  updateSet,
  finishSession,
  getActiveSession,
  listDoneSessions,
  savePlan,
  setSessionNote,
  startSession,
  type ActiveSession,
  type SessionPlan,
} from '@/data/repositories/sessionRepository';
import {
  listReferences,
  setReference,
  type ReferenceLoad,
} from '@/data/repositories/referenceRepository';
import { CUSTOM_PREFIX, getSettings, type Settings } from '@/data/repositories/settingsRepository';
import { loadSettings } from '@/ui/useSettings';
import {
  addExercise,
  alternativesFor,
  completeExercise,
  endSession,
  isCrowded,
  markBusy,
  nextStep,
  previousExercise as previousInQueue,
  reopenPrevious,
  startNow,
  startQueue,
  stillBusy,
  type Alternative,
} from '@/domain/busyMachine';
import { defaultStepsFor, withAddOns } from '@/domain/loadSteps';
import { dueTemplate } from '@/domain/planning';
import { nextSetProposal, REST_SECONDS, repRangeFor, startingProposal } from '@/domain/progression';
import {
  buildSession,
  exercisesPerSession,
  readyMadeSession,
  withExtraSet,
  MAX_SETS,
  setsPerExercise,
} from '@/domain/sessionBuilder';
import {
  afterSupersetSet,
  proposeSupersets,
  supersetPairs,
  type SessionBlock,
} from '@/domain/supersets';
import { rotationFor, type SessionTemplate } from '@/domain/trainingModels';
import type { Exercise, SessionLog, SetLog } from '@/domain/types';
import { warmupRamp } from '@/domain/warmup';
import { myLoad, type MyLoad } from '@/domain/myLoad';
import { cycleWeek, setsForWeek } from '@/domain/cycles';
import { earnedBadges, newRecords, type BadgeCode, type NewRecord } from '@/domain/achievements';
import { beatsRecord, personalRecords, weeksOnPace, type PersonalRecord } from '@/domain/stats';
import { addBadges } from '@/data/repositories/badgeRepository';
import { rescheduleNotifications } from '@/ui/notifications';
import { isPopular } from '@/data/catalog/curated';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { useCatalog } from '@/ui/useCatalog';
import { PRESET_PREFIX, resolvePreset } from '@/domain/presets';
import { firstTimeEstimateKg } from '@/domain/firstLoad';
import { restAfterSet } from '@/domain/restTime';
import {
  afterMovingSets,
  movePending,
  removeFromQueue,
  replaceInQueue,
  replacementsFor,
  withoutSet,
} from '@/domain/sessionEdit';
import { presetSession } from '@/data/content/presetSessions';
import {
  assistedScale,
  bodyWeightOn,
  DEFAULT_ASSISTANCE_STEPS,
  DEFAULT_BODY_WEIGHT_KG,
  firstAssistedRealKg,
  withRealLoads,
  type AssistedScale,
} from '@/domain/assisted';
import {
  addMeasurement,
  listMeasurements,
  type BodyMeasurement,
} from '@/data/repositories/bodyRepository';

export interface Proposal {
  readonly loadKg: number;
  readonly targetReps: number;
  /** Why this load: shown to the user in plain words. */
  readonly reason: string;
  readonly reminders: readonly string[];
}

type Phase = 'loading' | 'idle' | 'active' | 'finished' | 'error';

const phase = ref<Phase>('loading');
const errorMessage = ref('');
const settings = ref<Settings>();
const history = ref<(SessionLog & { plan: Partial<SessionPlan>; note?: string })[]>([]);
const references = ref<ReferenceLoad[]>([]);
/** Weighings of the Body tab: assisted exercises need the body weight. */
const weighings = ref<BodyMeasurement[]>([]);
const active = ref<ActiveSession>();
const restEndsAt = ref<number>();
/** Record just beaten, for the celebration on the screen (cleared at the next set). */
const recordBeaten = ref<{ exerciseId: string; loadKg: number; reps: number }>();
const summary = ref<{
  sets: number;
  workloadKg: number;
  carryOver: readonly string[];
  records: readonly NewRecord[];
  backToLevel: readonly string[];
  badges: readonly BadgeCode[];
  weeksOnPace: number;
  /** Machines used today that are not in "my machines" yet (ready-made session…). */
  newMachines: readonly string[];
  /** Length of the session, when known. */
  minutes?: number;
  /** Volume gained since the last session of the same type, in percent. */
  volumeGain?: number;
}>();

const { entries, state: catalogState, toggleFavorite } = useCatalog();

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const byId = computed(() => new Map(entries.value.map((e) => [e.exercise.id, e])));
const favorites = computed(() => entries.value.filter((e) => e.favorite));
const entryOf = (id: string): CatalogEntry | undefined => byId.value.get(id);
/** Plates of the machine (or the defaults), with the add-on weights clipped on top. */
const stepsOf = (entry: CatalogEntry) =>
  withAddOns(
    entry.loadSteps.length > 0
      ? entry.loadSteps
      : entry.exercise.assisted
        ? DEFAULT_ASSISTANCE_STEPS
        : defaultStepsFor(entry.exercise.equipment),
    entry.setup.addOnsKg,
  );

/** Body weight today, from the last weighing; undefined until the user enters it. */
const bodyWeight = computed(() => bodyWeightOn(today(), weighings.value));

/**
 * Assisted machine: the rules run on the real load (body weight − help), with
 * today's weight, then give back the help to set. Undefined for other machines.
 */
function scaleOf(entry: CatalogEntry): AssistedScale | undefined {
  return entry.exercise.assisted
    ? assistedScale(stepsOf(entry), bodyWeight.value ?? DEFAULT_BODY_WEIGHT_KG)
    : undefined;
}
const toRealSet = <S extends SetLog>(scale: AssistedScale | undefined, set: S): S =>
  scale ? { ...set, loadKg: scale.toReal(set.loadKg) } : set;

/** Real load lifted for a load logged: the load itself, or body weight − help. */
function realLoadFor(exerciseId: string, loadKg: number): number {
  const entry = entryOf(exerciseId);
  const scale = entry && scaleOf(entry);
  return scale ? scale.toReal(loadKg) : loadKg;
}

/** The history with real loads on assisted sets, for charts and records. */
const realHistory = computed(() =>
  withRealLoads(
    history.value,
    (id) => entryOf(id)?.exercise.assisted === true,
    (date) => bodyWeightOn(date, weighings.value) ?? DEFAULT_BODY_WEIGHT_KG,
  ),
);

/** Records of each exercise before today, on the real load. */
const records = computed(() => personalRecords(realHistory.value));

/** Record to beat on an exercise: the best of past sessions and of today. */
function recordFor(exerciseId: string): PersonalRecord | undefined {
  const past = records.value.get(exerciseId);
  const today = recordBeaten.value;
  if (!past || today?.exerciseId !== exerciseId) return past;
  return {
    ...past,
    bestLoad: { loadKg: today.loadKg, reps: today.reps, date: past.bestLoad.date },
  };
}

/** Last session of the rotation done (custom sessions are left out). */
const lastDone = computed(() => {
  if (!settings.value) return undefined;
  const rotation = rotationFor(settings.value.model);
  return [...history.value].reverse().find((s) => rotation.some((t) => t.id === s.templateId));
});
const lastDoneTemplateId = computed(() => lastDone.value?.templateId);

/** Template of the next session: the user's pick, or the rotation after the last session done. */
const template = computed<SessionTemplate | undefined>(() => {
  if (!settings.value) return undefined;
  return dueTemplate(rotationFor(settings.value.model), lastDone.value, settings.value.nextChoice);
});

/** Exercises proposed for the next session, from the favorite machines. */
const preview = computed<Exercise[]>(() => {
  if (!settings.value || !template.value) return [];
  const count = exercisesPerSession(settings.value.sessionMinutes);
  const built = buildSession({
    template: template.value,
    favorites: favorites.value.map((e) => e.exercise),
    count,
    ...(settings.value.protectedZone ? { protectedZone: settings.value.protectedZone } : {}),
  });
  // Machines that stayed taken last time come back first.
  const lastSame = [...history.value].reverse().find((s) => s.templateId === template.value?.id);
  const carried = (lastSame?.plan.carryOver ?? [])
    .map((id) => entryOf(id)?.exercise)
    .filter((e): e is CatalogExercise => !!e && !built.some((b) => b.id === e.id));
  return [...carried, ...built].slice(0, Math.max(count, carried.length));
});

function historyFor(exerciseId: string): SetLog[][] {
  return history.value
    .map((s) => s.sets.filter((set) => set.exerciseId === exerciseId))
    .filter((sets) => sets.length > 0);
}

function setsInSession(exerciseId: string): SetLog[] {
  return active.value?.sets.filter((s) => s.exerciseId === exerciseId) ?? [];
}
function workSetsInSession(exerciseId: string): SetLog[] {
  return setsInSession(exerciseId).filter((s) => !s.warmup);
}

/** Work sets of the last finished session with this exercise ("last time"). */
function lastTimeSets(exerciseId: string): SetLog[] {
  return (historyFor(exerciseId).at(-1) ?? []).filter((s) => !s.warmup);
}

/**
 * What the next set is compared with: the previous set of today, or the set
 * with the same number last time.
 */
function previousFor(exerciseId: string): SetLog | undefined {
  const today = workSetsInSession(exerciseId);
  if (today.length > 0) return today.at(-1);
  return lastTimeSets(exerciseId)[0];
}

/** Rep range of an exercise today: the ready-made session's own, else the exercise default. */
function rangeOf(entry: CatalogEntry) {
  return (
    active.value?.plan.exercises.find((e) => e.exerciseId === entry.exercise.id)?.repRange ??
    repRangeFor(entry.exercise)
  );
}

/** Load and reps to pre-fill for the next set of an exercise. */
function proposalFor(exerciseId: string): Proposal | undefined {
  const entry = entryOf(exerciseId);
  if (!entry) return undefined;
  const range = rangeOf(entry);
  const scale = scaleOf(entry);
  const steps = scale?.realSteps ?? stepsOf(entry);
  // Back from the real load to what is set on the machine.
  const toMachine = (loadKg: number) => (scale ? scale.toAssistance(loadKg) : loadKg);
  const last = workSetsInSession(exerciseId).at(-1);
  if (last) {
    const p = nextSetProposal({ set: toRealSet(scale, last), range, steps, isLastSet: false });
    return {
      loadKg: toMachine(p.loadKg),
      targetReps: p.targetReps,
      reason: p.reason,
      reminders: p.reminders,
    };
  }
  const reference = references.value.find((r) => r.exerciseId === exerciseId);
  const referenceKg = reference && (scale ? scale.toReal(reference.loadKg) : reference.loadKg);
  const comeback = settings.value?.comeback;
  const start = startingProposal({
    history: historyFor(exerciseId).map((sets) => sets.map((set) => toRealSet(scale, set))),
    range,
    steps,
    ...(comeback && referenceKg !== undefined
      ? { comeback: { referenceKg, pause: comeback.pause } }
      : {}),
    ...(!comeback && reference && referenceKg !== undefined
      ? { usual: { loadKg: referenceKg, reps: reference.reps } }
      : {}),
    firstTimeKg: firstTimeEstimateKg(entry.exercise, bodyWeight.value ?? DEFAULT_BODY_WEIGHT_KG),
  });
  // A test set on a help machine: about half the body weight, not the full help.
  const startKg =
    scale && start.kind === 'testSet'
      ? firstAssistedRealKg(scale, bodyWeight.value ?? DEFAULT_BODY_WEIGHT_KG)
      : start.loadKg;
  return {
    loadKg: tired() ? noHigherThanLastTime(exerciseId, toMachine(startKg)) : toMachine(startKg),
    targetReps: start.targetReps,
    reason: start.kind,
    reminders: [],
  };
}

const tired = () => active.value?.plan.tired ?? tiredToday.value;

/** Not in shape: last time's load at most (on a help machine, at least last time's help). */
function noHigherThanLastTime(exerciseId: string, loadKg: number): number {
  const last = lastTimeSets(exerciseId).map((s) => s.loadKg);
  if (last.length === 0) return loadKg;
  return entryOf(exerciseId)?.exercise.assisted
    ? Math.max(loadKg, Math.min(...last))
    : Math.min(loadKg, Math.max(...last));
}

/**
 * "Not in shape today", chosen before starting: one set less per exercise and
 * no load increase. Training anyway, without digging a hole.
 */
const tiredToday = ref(false);
/** Lighter today: a light week of the cycle, or the user said so. */
const lighter = () => cycle.value.light || tiredToday.value;

function plannedSets(exerciseId: string): number {
  return (
    active.value?.plan.exercises.find((e) => e.exerciseId === exerciseId)?.sets ??
    // Before the session: what start() will plan, one set less in a light week.
    setsForWeek(setsPerExercise(settings.value?.goal ?? 'hypertrophy'), lighter())
  );
}

const step = computed(() => (active.value ? nextStep(active.value.plan.queue) : undefined));

/** Exercises whose warm-up the user skipped in this session. */
const warmupSkipped = ref<string[]>([]);

/** Next warm-up set to do before the first work set, with its place in the ramp. */
const warmup = computed(() => {
  const s = step.value;
  if (s?.kind !== 'exercise' || !active.value) return undefined;
  if (workSetsInSession(s.exerciseId).length > 0) return undefined;
  if (warmupSkipped.value.includes(s.exerciseId)) return undefined;
  const entry = entryOf(s.exerciseId);
  const proposal = proposalFor(s.exerciseId);
  // No warm-up set with a help machine (lighter means more help), nor before a
  // first-time test set, which is already light.
  if (!entry || !proposal || entry.exercise.assisted || proposal.reason === 'testSet') {
    return undefined;
  }
  const done = setsInSession(s.exerciseId).filter((set) => set.warmup).length;
  const ramp = warmupRamp({
    exercise: entry.exercise,
    workLoadKg: proposal.loadKg,
    steps: stepsOf(entry),
    // First exercise: nothing logged yet, or only its own warm-up sets.
    isFirst: active.value.sets.every((set) => set.exerciseId === s.exerciseId && set.warmup),
  });
  const next = ramp[done];
  return next ? { ...next, index: done + 1, total: ramp.length } : undefined;
});

async function load(): Promise<void> {
  phase.value = 'loading';
  try {
    const { db } = await openAppDatabase();
    settings.value = await getSettings(db);
    history.value = await listDoneSessions(db);
    references.value = await listReferences(db);
    weighings.value = await listMeasurements(db);
    active.value = await getActiveSession(db);
    phase.value = active.value ? 'active' : 'idle';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
    phase.value = 'error';
  }
}

/** Saved first, shown second: the screen never shows a plan that a crash would lose. */
async function updatePlan(plan: SessionPlan): Promise<void> {
  const session = active.value;
  if (!session) return;
  const { db } = await openAppDatabase();
  await savePlan(db, session.id, plan);
  if (active.value?.id === session.id) active.value = { ...active.value, plan };
}

/** Express session: 3 exercises (compounds kept), isolation paired in supersets. */
const EXPRESS_EXERCISES = 3;

const expressPreview = computed<Exercise[]>(() => {
  if (!settings.value || !template.value) return [];
  return buildSession({
    template: template.value,
    favorites: favorites.value.map((e) => e.exercise),
    count: EXPRESS_EXERCISES,
    ...(settings.value.protectedZone ? { protectedZone: settings.value.protectedZone } : {}),
  });
});

/**
 * Pre-session: when the favorites do not fill the session, popular machines
 * (illustrated ones first) complete it. Empty when the favorites are enough.
 */
const readyMade = computed(() => {
  if (!settings.value || !template.value) return undefined;
  const count = exercisesPerSession(settings.value.sessionMinutes);
  if (preview.value.length >= count) return undefined;
  // Help machines need the body weight and are not in every gym: never suggested unasked.
  const popular = entries.value
    .filter((e) => isPopular(e.exercise.id) && !e.exercise.assisted)
    .map((e) => e.exercise)
    .sort((a, b) => Number(!!illustrationFor(b.id)) - Number(!!illustrationFor(a.id)));
  const session = readyMadeSession({
    template: template.value,
    favorites: favorites.value.map((e) => e.exercise),
    popular,
    count,
    ...(settings.value.protectedZone ? { protectedZone: settings.value.protectedZone } : {}),
  });
  return session.suggestedIds.length > 0 ? session : undefined;
});

/** Stars the machines of the pre-session: the next sessions will use them. */
async function adoptReadyMade(): Promise<void> {
  for (const id of readyMade.value?.suggestedIds ?? []) {
    if (!entryOf(id)?.favorite) await toggleFavorite(id);
  }
}

/** Home workout: any catalog exercise doable with the equipment at home. */
const homePreview = computed<Exercise[]>(() => {
  if (!settings.value || !template.value) return [];
  const available = new Set(settings.value.homeEquipment);
  return buildSession({
    template: template.value,
    favorites: entries.value.map((e) => e.exercise).filter((e) => available.has(e.equipment)),
    count: exercisesPerSession(settings.value.sessionMinutes),
    ...(settings.value.protectedZone ? { protectedZone: settings.value.protectedZone } : {}),
  });
});

/** Where we are in the training block (4 normal weeks, then a lighter one). */
const cycle = computed(() =>
  cycleWeek(settings.value?.programStart ?? history.value[0]?.date ?? today(), today()),
);

/** The exercises as they would be done in supersets, with the user's spared zone. */
function supersetBlocks<E extends Exercise>(exercises: readonly E[]): SessionBlock[] {
  const zone = settings.value?.protectedZone;
  return proposeSupersets(exercises, zone ? { protectedZone: zone } : {});
}

/** Ready-made session: its exercises in order, with their sets, reps and rests. */
async function startPreset(presetId: string): Promise<void> {
  const preset = presetSession(presetId);
  if (!preset || !settings.value) return;
  const lines = resolvePreset(preset, {
    isFavorite: (id) => entryOf(id)?.favorite === true,
    exists: (id) => entryOf(id) !== undefined,
  });
  if (lines.length === 0) return;
  const ids = lines.map((line) => line.chosenId);
  const plan: SessionPlan = {
    exercises: lines.map((line) => ({
      exerciseId: line.chosenId,
      sets: setsForWeek(line.sets, lighter()),
      repRange: line.reps,
      restSeconds: line.restSeconds,
      ...(line.timed ? { timed: true } : {}),
      ...(line.perSide ? { perSide: true } : {}),
    })),
    queue: startQueue(ids),
    ...(tiredToday.value ? { tired: true } : {}),
  };
  const { db } = await openAppDatabase();
  await startSession(db, {
    date: today(),
    templateId: `${PRESET_PREFIX}${preset.id}`,
    gymId: settings.value.currentGymId,
    plan,
  });
  active.value = await getActiveSession(db);
  restEndsAt.value = undefined;
  tiredToday.value = false;
  phase.value = 'active';
}

async function start(
  options: {
    express?: boolean;
    home?: boolean;
    readyMade?: boolean;
    custom?: string;
    /** Chosen on the screen for this session; the setting otherwise. Never forced. */
    supersets?: boolean;
  } = {},
): Promise<void> {
  // A custom session: the exercises chosen by the user, in their order.
  const custom = options.custom
    ? (await loadSettings()).customSessions?.find((c) => c.id === options.custom)
    : undefined;
  const exercises = custom
    ? custom.exerciseIds
        .map((id) => entryOf(id)?.exercise)
        .filter((e): e is CatalogExercise => e !== undefined)
    : options.express
      ? expressPreview.value
      : options.home
        ? homePreview.value
        : options.readyMade
          ? (readyMade.value?.exercises ?? [])
          : preview.value;
  if (!template.value || exercises.length === 0 || !settings.value) return;
  const sets = setsForWeek(setsPerExercise(settings.value.goal), lighter());
  const pairs =
    (options.supersets ?? settings.value.supersets) ? supersetPairs(supersetBlocks(exercises)) : [];
  // Partners side by side in the order.
  const ids: string[] = [];
  for (const e of exercises) {
    if (ids.includes(e.id)) continue;
    ids.push(e.id);
    const pair = pairs.find((p) => p[0] === e.id);
    if (pair) ids.push(pair[1]);
  }
  const plan: SessionPlan = {
    exercises: ids.map((exerciseId) => {
      // A copied ready-made session keeps its own sets, reps and rests.
      const line = custom?.lines?.[exerciseId];
      return line
        ? {
            exerciseId,
            sets: setsForWeek(line.sets, lighter()),
            repRange: line.reps,
            restSeconds: line.restSeconds,
            ...(line.timed ? { timed: true } : {}),
            ...(line.perSide ? { perSide: true } : {}),
          }
        : { exerciseId, sets };
    }),
    queue: startQueue(ids),
    ...(pairs.length > 0 ? { supersets: pairs } : {}),
    ...(options.express ? { express: true } : {}),
    ...(tiredToday.value ? { tired: true } : {}),
  };
  const { db } = await openAppDatabase();
  await startSession(db, {
    date: today(),
    templateId: custom ? `${CUSTOM_PREFIX}${custom.id}` : template.value.id,
    gymId: settings.value.currentGymId,
    plan,
  });
  active.value = await getActiveSession(db);
  restEndsAt.value = undefined;
  tiredToday.value = false;
  phase.value = 'active';
}

/** Records a set; finishes the exercise when its sets are done or the rules say stop. */
async function logSet(set: SetLog): Promise<void> {
  if (!active.value) return;
  const { db } = await openAppDatabase();
  // Compared before the set joins today's sets: the record to beat is the one shown.
  const realLoad = realLoadFor(set.exerciseId, set.loadKg);
  const beaten = beatsRecord({ ...set, loadKg: realLoad }, recordFor(set.exerciseId));
  const stored = await addSet(db, active.value.id, set);
  active.value = { ...active.value, sets: [...active.value.sets, stored] };
  if (set.warmup) return;
  recordBeaten.value = beaten
    ? { exerciseId: set.exerciseId, loadKg: realLoad, reps: set.reps }
    : recordBeaten.value?.exerciseId === set.exerciseId
      ? recordBeaten.value
      : undefined;
  lastSetBeatRecord.value = beaten;

  const entry = entryOf(set.exerciseId);
  const done = workSetsInSession(set.exerciseId).length;
  const target = plannedSets(set.exerciseId);
  const isLast = done >= target;
  const scale = entry && scaleOf(entry);
  const rule =
    entry &&
    nextSetProposal({
      set: toRealSet(scale, set),
      range: rangeOf(entry),
      steps: scale?.realSteps ?? stepsOf(entry),
      isLastSet: isLast,
    });
  let queue = active.value.plan.queue;
  if (isLast || rule?.action === 'stop') queue = completeExercise(queue, set.exerciseId);
  // Superset: straight to the partner, rest after the second exercise only.
  const superset = afterSupersetSet(active.value.plan.supersets ?? [], set.exerciseId, (id) =>
    queue.pending.includes(id),
  );
  if (superset.next) queue = startNow(queue, superset.next);
  if (queue !== active.value.plan.queue) await updatePlan({ ...active.value.plan, queue });
  const kind = entry?.exercise.kind ?? 'isolation';
  // Usual rest of the exercise, adapted to how hard the set was.
  const rest = restAfterSet(
    active.value.plan.exercises.find((e) => e.exerciseId === set.exerciseId)?.restSeconds ??
      REST_SECONDS[kind].max,
    set.difficulty,
  );
  restEndsAt.value = superset.rest ? Date.now() + rest * 1000 : undefined;
}

/** The set just logged beat the record: the screen celebrates it. */
const lastSetBeatRecord = ref(false);

async function undoLastSet(): Promise<void> {
  const last = active.value?.sets.at(-1);
  if (!active.value || !last) return;
  const { db } = await openAppDatabase();
  await deleteSet(db, last.id);
  const sets = active.value.sets.slice(0, -1);
  // An exercise reopened by the undo goes back to the front of the queue.
  const queue = active.value.plan.queue.done.includes(last.exerciseId)
    ? startNow(
        {
          ...active.value.plan.queue,
          done: active.value.plan.queue.done.filter((id) => id !== last.exerciseId),
        },
        last.exerciseId,
      )
    : active.value.plan.queue;
  active.value = { ...active.value, sets };
  await updatePlan({ ...active.value.plan, queue });
  restEndsAt.value = undefined;
}

/** Correction of a set validated too fast: load, reps or feeling. */
async function editSessionSet(
  setId: string,
  values: Pick<SetLog, 'loadKg' | 'reps' | 'difficulty'>,
): Promise<void> {
  if (!active.value) return;
  const { db } = await openAppDatabase();
  await updateSet(db, setId, values);
  active.value = {
    ...active.value,
    sets: active.value.sets.map((s) => (s.id === setId ? { ...s, ...values } : s)),
  };
}

/** A set logged by mistake: removed; its exercise reopens if it now lacks sets. */
async function removeSessionSet(setId: string): Promise<void> {
  const removed = active.value?.sets.find((s) => s.id === setId);
  if (!active.value || !removed) return;
  const { db } = await openAppDatabase();
  await deleteSet(db, setId);
  active.value = { ...active.value, sets: active.value.sets.filter((s) => s.id !== setId) };
  const queue = active.value.plan.queue;
  const lacking =
    !removed.warmup &&
    queue.done.includes(removed.exerciseId) &&
    workSetsInSession(removed.exerciseId).length < plannedSets(removed.exerciseId);
  if (lacking) {
    await updatePlan({
      ...active.value.plan,
      queue: startNow(
        { ...queue, done: queue.done.filter((id) => id !== removed.exerciseId) },
        removed.exerciseId,
      ),
    });
  }
}

function alternatives(exerciseId: string): Alternative[] {
  const busy = entryOf(exerciseId)?.exercise;
  if (!busy || !active.value) return [];
  const queue = active.value.plan.queue;
  const inSession = new Set([
    ...queue.pending,
    ...queue.done,
    ...queue.waiting.map((w) => w.exerciseId),
  ]);
  return alternativesFor(busy, {
    remaining: queue.pending
      .filter((id) => id !== exerciseId)
      .map((id) => entryOf(id)?.exercise)
      .filter((e): e is CatalogExercise => !!e),
    otherFavorites: favorites.value.map((e) => e.exercise).filter((e) => !inSession.has(e.id)),
    loadFor: (id) => proposalFor(id)?.loadKg,
  });
}

async function markMachineBusy(exerciseId: string): Promise<void> {
  if (!active.value) return;
  await updatePlan({ ...active.value.plan, queue: markBusy(active.value.plan.queue, exerciseId) });
}

async function chooseAlternative(alternative: Alternative): Promise<void> {
  if (!active.value) return;
  const plan = active.value.plan;
  const exercises = plan.exercises.some((e) => e.exerciseId === alternative.exercise.id)
    ? plan.exercises
    : [
        ...plan.exercises,
        { exerciseId: alternative.exercise.id, sets: plannedSets(alternative.exercise.id) },
      ];
  await updatePlan({ ...plan, exercises, queue: startNow(plan.queue, alternative.exercise.id) });
}

async function machineFree(exerciseId: string): Promise<void> {
  if (!active.value) return;
  await updatePlan({ ...active.value.plan, queue: startNow(active.value.plan.queue, exerciseId) });
}

async function machineStillBusy(exerciseId: string): Promise<void> {
  if (!active.value) return;
  await updatePlan({ ...active.value.plan, queue: stillBusy(active.value.plan.queue, exerciseId) });
}

/** Removes exercises from the rest of the session (discomfort), without logging anything. */
async function removeExercises(exerciseIds: readonly string[]): Promise<void> {
  if (!active.value || exerciseIds.length === 0) return;
  const queue = exerciseIds.reduce(
    (q, id) => ({
      ...q,
      pending: q.pending.filter((p) => p !== id),
      waiting: q.waiting.filter((w) => w.exerciseId !== id),
    }),
    active.value.plan.queue,
  );
  await updatePlan({ ...active.value.plan, queue });
}

async function saveNote(note: string): Promise<void> {
  if (!active.value) return;
  const { db } = await openAppDatabase();
  await setSessionNote(db, active.value.id, note);
  const { note: _previous, ...rest } = active.value;
  active.value = note.trim() ? { ...rest, note: note.trim() } : rest;
}

async function skipExercise(exerciseId: string): Promise<void> {
  if (!active.value) return;
  await updatePlan({
    ...active.value.plan,
    queue: completeExercise(active.value.plan.queue, exerciseId),
  });
}

/**
 * One more set than planned. On the exercise just finished, it is reopened
 * so the extra set comes right now.
 */
async function extraSet(exerciseId: string): Promise<void> {
  if (!active.value) return;
  const plan = active.value.plan;
  const queue =
    previousInQueue(plan.queue) === exerciseId ? reopenPrevious(plan.queue) : plan.queue;
  await updatePlan({
    ...plan,
    exercises: withExtraSet(plan.exercises, exerciseId, plannedSets(exerciseId)),
    queue,
  });
}

/** Exercise added by hand: done now, with the usual number of sets. */
async function addExerciseNow(exerciseId: string): Promise<void> {
  if (!active.value || !settings.value) return;
  const plan = active.value.plan;
  const exercises = plan.exercises.some((e) => e.exerciseId === exerciseId)
    ? plan.exercises
    : [
        ...plan.exercises,
        {
          exerciseId,
          sets: setsForWeek(setsPerExercise(settings.value.goal), cycle.value.light),
        },
      ];
  await updatePlan({ ...plan, exercises, queue: addExercise(plan.queue, exerciseId) });
}

/** Same movement on another machine: my machines and the common ones, not already in the session. */
function replacements(exerciseId: string): CatalogExercise[] {
  const exercise = entryOf(exerciseId)?.exercise;
  const queue = active.value?.plan.queue;
  if (!exercise || !queue) return [];
  const inSession = new Set([
    ...queue.pending,
    ...queue.done,
    ...queue.waiting.map((w) => w.exerciseId),
  ]);
  const candidates = entries.value
    .filter((e) => (e.favorite || isPopular(e.exercise.id)) && !inSession.has(e.exercise.id))
    .map((e) => e.exercise);
  return replacementsFor(exercise, candidates, (id) => entryOf(id)?.favorite === true);
}

/**
 * Where sets of this machine may really have been done: the same movement,
 * the machines of today's session and my machines first.
 */
function sameMovement(exerciseId: string): string[] {
  const exercise = entryOf(exerciseId)?.exercise;
  const queue = active.value?.plan.queue;
  if (!exercise) return [];
  const today = new Set([
    ...(queue?.pending ?? []),
    ...(queue?.done ?? []),
    ...(queue?.waiting.map((w) => w.exerciseId) ?? []),
  ]);
  const candidates = entries.value
    .filter((e) => e.favorite || isPopular(e.exercise.id) || today.has(e.exercise.id))
    .map((e) => e.exercise);
  return replacementsFor(
    exercise,
    candidates,
    (id) => today.has(id) || entryOf(id)?.favorite === true,
  ).map((e) => e.id);
}

/**
 * Another machine instead of this one. Sets already done here stay here (the
 * history stays right), the new machine gets the sets left to do.
 */
async function replaceExercise(fromId: string, toId: string): Promise<void> {
  if (!active.value) return;
  const plan = active.value.plan;
  const done = workSetsInSession(fromId).length;
  const line = plan.exercises.find((e) => e.exerciseId === fromId);
  const remaining = Math.max(1, plannedSets(fromId) - done);
  const others = plan.exercises.filter((e) => e.exerciseId !== toId);
  const exercises =
    done === 0
      ? others.map((e) => (e.exerciseId === fromId ? { ...e, exerciseId: toId } : e))
      : [...others, { ...(line ?? { sets: remaining }), exerciseId: toId, sets: remaining }];
  const queue =
    done === 0
      ? replaceInQueue(plan.queue, fromId, toId)
      : startNow(completeExercise(plan.queue, fromId), toId);
  const swap = (id: string) => (id === fromId ? toId : id);
  const supersets = plan.supersets?.map(([a, b]) => [swap(a), swap(b)] as const);
  await updatePlan({ ...plan, exercises, queue, ...(supersets ? { supersets } : {}) });
}

/** One place earlier or later among the exercises to come. */
async function moveExercise(exerciseId: string, delta: -1 | 1): Promise<void> {
  if (!active.value) return;
  await updatePlan({
    ...active.value.plan,
    queue: movePending(active.value.plan.queue, exerciseId, delta),
  });
}

/** Removed from the rest of the session; with sets already done, it is simply finished. */
async function removeExercise(exerciseId: string): Promise<void> {
  if (!active.value) return;
  const queue = active.value.plan.queue;
  await updatePlan({
    ...active.value.plan,
    queue:
      setsInSession(exerciseId).length > 0
        ? completeExercise(queue, exerciseId)
        : removeFromQueue(queue, exerciseId),
  });
}

/** One set less than planned; the exercise ends if its sets are now all done. */
async function removePlannedSet(exerciseId: string): Promise<void> {
  if (!active.value) return;
  const plan = active.value.plan;
  const done = workSetsInSession(exerciseId).length;
  const exercises = withoutSet(plan.exercises, exerciseId, done);
  const target = exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? 0;
  const queue =
    done > 0 && done >= target && plan.queue.pending.includes(exerciseId)
      ? completeExercise(plan.queue, exerciseId)
      : plan.queue;
  await updatePlan({ ...plan, exercises, queue });
}

/**
 * Sets logged on the wrong machine moved to the right one, in the session
 * in progress. Each machine keeps a true history.
 */
async function moveLoggedSets(setIds: readonly string[], toId: string): Promise<void> {
  const session = active.value;
  const moved = session?.sets.filter((s) => setIds.includes(s.id)) ?? [];
  const fromId = moved[0]?.exerciseId;
  if (!session || !fromId || fromId === toId) return;
  const { db } = await openAppDatabase();
  await moveSets(db, setIds, toId);
  active.value = {
    ...session,
    sets: session.sets.map((s) => (setIds.includes(s.id) ? { ...s, exerciseId: toId } : s)),
  };
  const plan = session.plan;
  const movedWork = moved.filter((s) => !s.warmup).length;
  const exercises = plan.exercises.some((e) => e.exerciseId === toId)
    ? plan.exercises
    : [...plan.exercises, { exerciseId: toId, sets: Math.max(movedWork, plannedSets(fromId)) }];
  const toTarget = exercises.find((e) => e.exerciseId === toId)?.sets ?? movedWork;
  const queue = afterMovingSets(plan.queue, {
    fromId,
    toId,
    fromHasSetsLeft: setsInSession(fromId).length > 0,
    toComplete: workSetsInSession(toId).length >= toTarget,
  });
  await updatePlan({ ...plan, exercises, queue });
}

/** Any change of a finished session (correction, forgotten set…), then the history again. */
async function editHistory(change: (db: SqlDatabase) => Promise<unknown>): Promise<void> {
  const { db } = await openAppDatabase();
  await change(db);
  history.value = await listDoneSessions(db);
}

/** Supersets are an option: a pair can be split at any time, sets then follow as usual. */
async function splitSuperset(exerciseId: string): Promise<void> {
  if (!active.value) return;
  const supersets = (active.value.plan.supersets ?? []).filter((p) => !p.includes(exerciseId));
  const { supersets: _old, ...rest } = active.value.plan;
  await updatePlan(supersets.length > 0 ? { ...rest, supersets } : rest);
}

/** Back to the previous exercise, e.g. skipped too fast. Sets already logged stay. */
async function goBack(): Promise<void> {
  if (!active.value) return;
  await updatePlan({ ...active.value.plan, queue: reopenPrevious(active.value.plan.queue) });
  restEndsAt.value = undefined;
}

async function finish(): Promise<void> {
  if (!active.value) return;
  const { db } = await openAppDatabase();
  const work = active.value.sets.filter((s) => !s.warmup);
  if (active.value.sets.length === 0) {
    await abandonSession(db, active.value.id);
  } else {
    const { carryOver } = endSession(active.value.plan.queue);
    await finishSession(db, active.value.id, { ...active.value.plan, carryOver });
    const finished: SessionLog = {
      id: active.value.id,
      date: active.value.date,
      templateId: active.value.templateId,
      sets: active.value.sets,
    };
    // Records and workload on the real load (assisted machines counted backwards).
    const [realFinished] = withRealLoads(
      [finished],
      (id) => entryOf(id)?.exercise.assisted === true,
      () => bodyWeight.value ?? DEFAULT_BODY_WEIGHT_KG,
    );
    const real = realFinished ?? finished;
    const records = newRecords(realHistory.value, real);
    const all = [...history.value, finished];
    // Back to the old level: the pre-break reference is replaced by the new best.
    const backToLevel: string[] = [];
    if (settings.value?.comeback) {
      for (const reference of references.value) {
        const best = Math.max(
          0,
          ...finished.sets
            .filter(
              (s) => s.exerciseId === reference.exerciseId && !s.warmup && s.completeReps !== false,
            )
            .map((s) => s.loadKg),
        );
        if (best >= reference.loadKg) {
          backToLevel.push(reference.exerciseId);
          await setReference(db, { ...reference, loadKg: best, date: finished.date });
        }
      }
      references.value = await listReferences(db);
    }
    const perWeek = settings.value?.sessionsPerWeek ?? 3;
    const badges = await addBadges(
      db,
      earnedBadges({
        sessions: all,
        sessionsPerWeek: perWeek,
        today: finished.date,
        recordsBeaten: records.length,
        backToLevelReached: backToLevel.length > 0,
      }),
      finished.date,
    );
    const workloadKg = workload(real.sets);
    const previous = realHistory.value.filter((s) => s.templateId === finished.templateId).at(-1);
    const minutes = sessionMinutes(active.value.plan.startedAt, Date.now());
    const volumeGain = previous && volumeGainPercent(workload(previous.sets), workloadKg);
    summary.value = {
      sets: work.length,
      workloadKg,
      ...(minutes !== undefined ? { minutes } : {}),
      ...(volumeGain !== undefined ? { volumeGain } : {}),
      carryOver,
      records,
      backToLevel,
      badges,
      weeksOnPace: weeksOnPace(all, perWeek, finished.date).current,
      newMachines: [...new Set(work.map((s) => s.exerciseId))].filter(
        (id) => entryOf(id)?.favorite === false,
      ),
    };
  }
  active.value = undefined;
  restEndsAt.value = undefined;
  recordBeaten.value = undefined;
  lastSetBeatRecord.value = false;
  history.value = await listDoneSessions(db);
  if (settings.value) await rescheduleNotifications(settings.value);
  phase.value = summary.value ? 'finished' : 'idle';
}

async function saveReference(
  exerciseId: string,
  loadKg: number,
  reps: number,
  date: string = today(),
): Promise<void> {
  const { db } = await openAppDatabase();
  const reference = { exerciseId, loadKg, reps, date };
  await setReference(db, reference);
  references.value = [...references.value.filter((r) => r.exerciseId !== exerciseId), reference];
}

/** Load lifted on a machine, for the catalog and the card. */
function myLoadFor(exerciseId: string): MyLoad | undefined {
  const reference = references.value.find((r) => r.exerciseId === exerciseId);
  return myLoad({
    sessions: history.value
      .map((s) => ({ date: s.date, sets: s.sets.filter((set) => set.exerciseId === exerciseId) }))
      .filter((s) => s.sets.length > 0),
    ...(reference
      ? { noted: { loadKg: reference.loadKg, reps: reference.reps, date: reference.date } }
      : {}),
  });
}

/** Heaviest complete work set since the comeback started, for the "back to level" gauge. */
function bestSinceComeback(exerciseId: string): number | undefined {
  const since = settings.value?.comeback?.startedOn ?? '';
  const loads = history.value
    .filter((s) => s.date >= since)
    .flatMap((s) => s.sets)
    .filter((set) => set.exerciseId === exerciseId && !set.warmup && set.completeReps !== false)
    .map((set) => set.loadKg);
  return loads.length > 0 ? Math.max(...loads) : undefined;
}

/** Weight typed in the profile: a weighing of today, shown in the Body tab too. */
async function saveBodyWeight(weightKg: number): Promise<void> {
  const { db } = await openAppDatabase();
  await addMeasurement(db, { date: today(), weightKg, measurements: {} });
  weighings.value = await listMeasurements(db);
}

/** One tap on the summary: the machines used today join "my machines". */
async function adoptMachines(ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    if (entryOf(id)?.favorite === false) await toggleFavorite(id);
  }
  if (summary.value) summary.value = { ...summary.value, newMachines: [] };
}

function closeSummary(): void {
  summary.value = undefined;
  phase.value = 'idle';
}

export function useSession() {
  if (phase.value === 'loading') void load();
  return {
    phase,
    errorMessage,
    catalogState,
    settings,
    template,
    expressPreview,
    homePreview,
    readyMade,
    adoptReadyMade,
    cycle,
    supersetPartner: (id: string) =>
      active.value?.plan.supersets?.find((p) => p.includes(id))?.find((other) => other !== id),
    /** 1 or 2: place of the exercise in its superset, undefined outside one. */
    supersetPlace: (id: string) => {
      const pair = active.value?.plan.supersets?.find((p) => p.includes(id));
      return pair ? (pair[0] === id ? 1 : 2) : undefined;
    },
    supersetBlocks,
    lastDoneTemplateId,
    lastDoneSessionId: computed(() => lastDone.value?.id),
    history,
    realHistory,
    bodyWeight,
    weighings,
    saveBodyWeight,
    reloadWeighings: async () => {
      const { db } = await openAppDatabase();
      weighings.value = await listMeasurements(db);
    },
    realLoadFor,
    preview,
    active,
    step,
    warmup,
    recordFor,
    lastSetBeatRecord,
    recordBeaten,
    skipWarmup: (exerciseId: string) => {
      warmupSkipped.value = [...warmupSkipped.value, exerciseId];
    },
    restEndsAt,
    summary,
    favoriteExercises: computed(() => favorites.value.map((e) => e.exercise)),
    crowded: computed(() => (active.value ? isCrowded(active.value.plan.queue) : false)),
    entryOf,
    stepsOf,
    proposalFor,
    tiredToday,
    lastTimeSets,
    previousFor,
    plannedSets,
    setsInSession,
    workSetsInSession,
    alternatives,
    start,
    startPreset,
    /** Ready-made session line: seconds held, or reps per leg. */
    planned: (id: string) => active.value?.plan.exercises.find((e) => e.exerciseId === id),
    logSet,
    undoLastSet,
    editSessionSet,
    removeSessionSet,
    markMachineBusy,
    chooseAlternative,
    machineFree,
    machineStillBusy,
    skipExercise,
    goBack,
    splitSuperset,
    addExerciseNow,
    editHistory,
    extraSet,
    replacements,
    sameMovement,
    replaceExercise,
    moveExercise,
    removeExercise,
    removePlannedSet,
    moveLoggedSets,
    canRemoveSet: (id: string) => plannedSets(id) > Math.max(1, workSetsInSession(id).length),
    canAddSet: (id: string) => plannedSets(id) < MAX_SETS,
    previousExercise: computed(() =>
      active.value ? previousInQueue(active.value.plan.queue) : undefined,
    ),
    saveNote,
    removeExercises,
    finish,
    adoptMachines,
    closeSummary,
    references,
    saveReference,
    myLoadFor,
    bestSinceComeback,
    endRest: () => (restEndsAt.value = undefined),
    /** A longer or shorter rest, without skipping it (never below now). */
    adjustRest: (seconds: number) => {
      if (restEndsAt.value === undefined) return;
      restEndsAt.value = Math.max(Date.now() + 1000, restEndsAt.value + seconds * 1000);
    },
    reload: load,
  };
}
