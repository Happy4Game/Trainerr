import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import type { SqlDatabase } from '@/data/sqlite/database';
import type { CatalogExercise } from '@/data/catalog/catalog';
import type { CatalogEntry } from '@/data/repositories/catalogRepository';
import {
  abandonSession,
  addSet,
  deleteSet,
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
import { defaultStepsFor } from '@/domain/loadSteps';
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
import { warmupSet } from '@/domain/warmup';
import { myLoad, type MyLoad } from '@/domain/myLoad';
import { cycleWeek, setsForWeek } from '@/domain/cycles';
import { earnedBadges, newRecords, type BadgeCode, type NewRecord } from '@/domain/achievements';
import { weeksOnPace } from '@/domain/stats';
import { addBadges } from '@/data/repositories/badgeRepository';
import { rescheduleNotifications } from '@/ui/notifications';
import { isPopular } from '@/data/catalog/curated';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { useCatalog } from '@/ui/useCatalog';

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
const active = ref<ActiveSession>();
const restEndsAt = ref<number>();
const summary = ref<{
  sets: number;
  workloadKg: number;
  carryOver: readonly string[];
  records: readonly NewRecord[];
  backToLevel: readonly string[];
  badges: readonly BadgeCode[];
  weeksOnPace: number;
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
const stepsOf = (entry: CatalogEntry) =>
  entry.loadSteps.length > 0 ? entry.loadSteps : defaultStepsFor(entry.exercise.equipment);

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

/** Load and reps to pre-fill for the next set of an exercise. */
function proposalFor(exerciseId: string): Proposal | undefined {
  const entry = entryOf(exerciseId);
  if (!entry) return undefined;
  const range = repRangeFor(entry.exercise);
  const steps = stepsOf(entry);
  const last = workSetsInSession(exerciseId).at(-1);
  if (last) {
    const p = nextSetProposal({ set: last, range, steps, isLastSet: false });
    return { loadKg: p.loadKg, targetReps: p.targetReps, reason: p.reason, reminders: p.reminders };
  }
  const reference = references.value.find((r) => r.exerciseId === exerciseId);
  const comeback = settings.value?.comeback;
  const start = startingProposal({
    history: historyFor(exerciseId),
    range,
    steps,
    ...(comeback && reference
      ? { comeback: { referenceKg: reference.loadKg, pause: comeback.pause } }
      : {}),
    ...(!comeback && reference
      ? { usual: { loadKg: reference.loadKg, reps: reference.reps } }
      : {}),
  });
  return { loadKg: start.loadKg, targetReps: start.targetReps, reason: start.kind, reminders: [] };
}

function plannedSets(exerciseId: string): number {
  return (
    active.value?.plan.exercises.find((e) => e.exerciseId === exerciseId)?.sets ??
    setsPerExercise(settings.value?.goal ?? 'hypertrophy')
  );
}

const step = computed(() => (active.value ? nextStep(active.value.plan.queue) : undefined));

const warmup = computed(() => {
  const s = step.value;
  if (s?.kind !== 'exercise' || !active.value) return undefined;
  if (setsInSession(s.exerciseId).length > 0) return undefined;
  const entry = entryOf(s.exerciseId);
  const proposal = proposalFor(s.exerciseId);
  if (!entry || !proposal) return undefined;
  return warmupSet({
    exercise: entry.exercise,
    workLoadKg: proposal.loadKg,
    steps: stepsOf(entry),
    isFirst: active.value.sets.length === 0,
  });
});

async function load(): Promise<void> {
  phase.value = 'loading';
  try {
    const { db } = await openAppDatabase();
    settings.value = await getSettings(db);
    history.value = await listDoneSessions(db);
    references.value = await listReferences(db);
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
  const popular = entries.value
    .filter((e) => isPopular(e.exercise.id))
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
  const sets = setsForWeek(setsPerExercise(settings.value.goal), cycle.value.light);
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
    exercises: ids.map((exerciseId) => ({ exerciseId, sets })),
    queue: startQueue(ids),
    ...(pairs.length > 0 ? { supersets: pairs } : {}),
    ...(options.express ? { express: true } : {}),
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
  phase.value = 'active';
}

/** Records a set; finishes the exercise when its sets are done or the rules say stop. */
async function logSet(set: SetLog): Promise<void> {
  if (!active.value) return;
  const { db } = await openAppDatabase();
  const stored = await addSet(db, active.value.id, set);
  active.value = { ...active.value, sets: [...active.value.sets, stored] };
  if (set.warmup) return;

  const entry = entryOf(set.exerciseId);
  const done = workSetsInSession(set.exerciseId).length;
  const target = plannedSets(set.exerciseId);
  const isLast = done >= target;
  const rule =
    entry &&
    nextSetProposal({
      set,
      range: repRangeFor(entry.exercise),
      steps: stepsOf(entry),
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
  restEndsAt.value = superset.rest ? Date.now() + REST_SECONDS[kind].max * 1000 : undefined;
}

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
    const records = newRecords(history.value, finished);
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
    summary.value = {
      sets: work.length,
      workloadKg: work.reduce((total, s) => total + s.loadKg * s.reps, 0),
      carryOver,
      records,
      backToLevel,
      badges,
      weeksOnPace: weeksOnPace(all, perWeek, finished.date).current,
    };
  }
  active.value = undefined;
  restEndsAt.value = undefined;
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
    preview,
    active,
    step,
    warmup,
    restEndsAt,
    summary,
    favoriteExercises: computed(() => favorites.value.map((e) => e.exercise)),
    crowded: computed(() => (active.value ? isCrowded(active.value.plan.queue) : false)),
    entryOf,
    stepsOf,
    proposalFor,
    lastTimeSets,
    previousFor,
    plannedSets,
    setsInSession,
    workSetsInSession,
    alternatives,
    start,
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
    canAddSet: (id: string) => plannedSets(id) < MAX_SETS,
    previousExercise: computed(() =>
      active.value ? previousInQueue(active.value.plan.queue) : undefined,
    ),
    saveNote,
    removeExercises,
    finish,
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
