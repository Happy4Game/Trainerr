import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import type { CatalogExercise } from '@/data/catalog/catalog';
import type { CatalogEntry } from '@/data/repositories/catalogRepository';
import { DEFAULT_GYM_ID } from '@/data/repositories/gymRepository';
import {
  abandonSession,
  addSet,
  deleteSet,
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
import { getSettings, type Settings } from '@/data/repositories/settingsRepository';
import {
  alternativesFor,
  completeExercise,
  endSession,
  isCrowded,
  markBusy,
  nextStep,
  startNow,
  startQueue,
  stillBusy,
  type Alternative,
} from '@/domain/busyMachine';
import { defaultStepsFor } from '@/domain/loadSteps';
import { nextTemplate } from '@/domain/planning';
import { nextSetProposal, REST_SECONDS, repRangeFor, startingProposal } from '@/domain/progression';
import { buildSession, exercisesPerSession, setsPerExercise } from '@/domain/sessionBuilder';
import { rotationFor, type SessionTemplate } from '@/domain/trainingModels';
import type { Exercise, SessionLog, SetLog } from '@/domain/types';
import { warmupSet } from '@/domain/warmup';
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
const summary = ref<{ sets: number; workloadKg: number; carryOver: readonly string[] }>();

const { entries, state: catalogState } = useCatalog();

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

const lastDoneTemplateId = computed(() => {
  if (!settings.value) return undefined;
  const rotation = rotationFor(settings.value.model);
  return [...history.value].reverse().find((s) => rotation.some((t) => t.id === s.templateId))
    ?.templateId;
});

/** Template of the next session: the rotation continues from the last session done. */
const template = computed<SessionTemplate | undefined>(() => {
  if (!settings.value) return undefined;
  return nextTemplate(rotationFor(settings.value.model), lastDoneTemplateId.value);
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

async function start(): Promise<void> {
  if (!template.value || preview.value.length === 0 || !settings.value) return;
  const sets = setsPerExercise(settings.value.goal);
  const ids = preview.value.map((e) => e.id);
  const plan: SessionPlan = {
    exercises: ids.map((exerciseId) => ({ exerciseId, sets })),
    queue: startQueue(ids),
  };
  const { db } = await openAppDatabase();
  await startSession(db, {
    date: today(),
    templateId: template.value.id,
    gymId: DEFAULT_GYM_ID,
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
  if (isLast || rule?.action === 'stop') {
    await updatePlan({
      ...active.value.plan,
      queue: completeExercise(active.value.plan.queue, set.exerciseId),
    });
  }
  const kind = entry?.exercise.kind ?? 'isolation';
  restEndsAt.value = Date.now() + REST_SECONDS[kind].max * 1000;
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

async function finish(): Promise<void> {
  if (!active.value) return;
  const { db } = await openAppDatabase();
  const work = active.value.sets.filter((s) => !s.warmup);
  if (active.value.sets.length === 0) {
    await abandonSession(db, active.value.id);
  } else {
    const { carryOver } = endSession(active.value.plan.queue);
    await finishSession(db, active.value.id, { ...active.value.plan, carryOver });
    summary.value = {
      sets: work.length,
      workloadKg: work.reduce((total, s) => total + s.loadKg * s.reps, 0),
      carryOver,
    };
  }
  active.value = undefined;
  restEndsAt.value = undefined;
  history.value = await listDoneSessions(db);
  phase.value = summary.value ? 'finished' : 'idle';
}

async function saveReference(exerciseId: string, loadKg: number, reps: number): Promise<void> {
  const { db } = await openAppDatabase();
  const reference = { exerciseId, loadKg, reps, date: today() };
  await setReference(db, reference);
  references.value = [...references.value.filter((r) => r.exerciseId !== exerciseId), reference];
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
    lastDoneTemplateId,
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
    plannedSets,
    setsInSession,
    workSetsInSession,
    alternatives,
    start,
    logSet,
    undoLastSet,
    markMachineBusy,
    chooseAlternative,
    machineFree,
    machineStillBusy,
    skipExercise,
    saveNote,
    removeExercises,
    finish,
    closeSummary,
    references,
    saveReference,
    bestSinceComeback,
    endRest: () => (restEndsAt.value = undefined),
    reload: load,
  };
}
