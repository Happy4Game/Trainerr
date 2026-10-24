import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import { listCatalog, type CatalogEntry } from '@/data/repositories/catalogRepository';
import {
  DEFAULT_GYM_ID,
  setFavorite,
  setLoadSteps,
  setMachineNote,
} from '@/data/repositories/gymRepository';
import { normalizeSteps } from '@/domain/loadSteps';

type LoadState = { kind: 'idle' | 'loading' | 'ready' } | { kind: 'error'; message: string };

// Shared by every screen: the catalog is read once per app launch.
const entries = ref<CatalogEntry[]>([]);
const state = ref<LoadState>({ kind: 'idle' });

async function load(): Promise<void> {
  if (state.value.kind === 'loading' || state.value.kind === 'ready') return;
  state.value = { kind: 'loading' };
  try {
    const { db } = await openAppDatabase();
    entries.value = await listCatalog(db, DEFAULT_GYM_ID);
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
  await setFavorite(db, DEFAULT_GYM_ID, id, favorite);
}

async function saveLoadSteps(id: string, steps: readonly number[]): Promise<void> {
  const loadSteps = normalizeSteps(steps);
  update(id, (entry) => ({ ...entry, loadSteps }));
  const { db } = await openAppDatabase();
  await setLoadSteps(db, DEFAULT_GYM_ID, id, loadSteps);
}

async function saveNote(id: string, note: string): Promise<void> {
  update(id, (entry) => {
    const { note: _previous, ...rest } = entry;
    return note.trim() ? { ...rest, note: note.trim() } : rest;
  });
  const { db } = await openAppDatabase();
  await setMachineNote(db, DEFAULT_GYM_ID, id, note);
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
  };
}
