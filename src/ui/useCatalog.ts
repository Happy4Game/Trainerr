import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import { listCatalog, type CatalogEntry } from '@/data/repositories/catalogRepository';
import {
  setFavorite,
  setLoadSteps,
  setMachineNote,
  setMachineSetup,
  cleanSetup,
  type MachineSetup,
  setPlatePhoto,
} from '@/data/repositories/gymRepository';
import { normalizeSteps } from '@/domain/loadSteps';
import { loadSettings } from '@/ui/useSettings';

/** Favorites, steps and photos belong to the gym chosen in the settings. */
const gymId = async () => (await loadSettings()).currentGymId;

type LoadState = { kind: 'idle' | 'loading' | 'ready' } | { kind: 'error'; message: string };

// Shared by every screen: the catalog is read once per app launch.
const entries = ref<CatalogEntry[]>([]);
const state = ref<LoadState>({ kind: 'idle' });

async function load(): Promise<void> {
  if (state.value.kind === 'loading' || state.value.kind === 'ready') return;
  state.value = { kind: 'loading' };
  try {
    const { db } = await openAppDatabase();
    entries.value = await listCatalog(db, await gymId());
    state.value = { kind: 'ready' };
  } catch (error) {
    state.value = {
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function update(id: string, change: (entry: CatalogEntry) => CatalogEntry): void {
  entries.value = entries.value.map((entry) => (entry.exercise.id === id ? change(entry) : entry));
}

async function toggleFavorite(id: string): Promise<void> {
  const favorite = !entries.value.find((e) => e.exercise.id === id)?.favorite;
  update(id, (entry) => ({ ...entry, favorite }));
  const { db } = await openAppDatabase();
  await setFavorite(db, await gymId(), id, favorite);
}

async function saveLoadSteps(id: string, steps: readonly number[]): Promise<void> {
  const loadSteps = normalizeSteps(steps);
  update(id, (entry) => ({ ...entry, loadSteps }));
  const { db } = await openAppDatabase();
  await setLoadSteps(db, await gymId(), id, loadSteps);
}

async function saveNote(id: string, note: string): Promise<void> {
  update(id, (entry) => {
    const { note: _previous, ...rest } = entry;
    return note.trim() ? { ...rest, note: note.trim() } : rest;
  });
  const { db } = await openAppDatabase();
  await setMachineNote(db, await gymId(), id, note);
}

async function saveSetup(id: string, setup: MachineSetup): Promise<void> {
  const clean = cleanSetup(setup);
  update(id, (entry) => ({ ...entry, setup: clean }));
  const { db } = await openAppDatabase();
  await setMachineSetup(db, await gymId(), id, clean);
}

async function savePlatePhoto(id: string, photo: string | undefined): Promise<void> {
  const { db } = await openAppDatabase();
  await setPlatePhoto(db, await gymId(), id, photo ?? null);
  update(id, (entry) => {
    const { platePhoto: _previous, ...rest } = entry;
    return photo ? { ...rest, platePhoto: photo } : rest;
  });
}

/** Reads the catalog again, e.g. after switching gym. */
export async function reloadCatalog(): Promise<void> {
  state.value = { kind: 'idle' };
  await load();
}

export function useCatalog() {
  void load();
  return {
    entries,
    state,
    entry: (id: string) => computed(() => entries.value.find((e) => e.exercise.id === id)),
    toggleFavorite,
    saveLoadSteps,
    saveNote,
    saveSetup,
    savePlatePhoto,
  };
}
