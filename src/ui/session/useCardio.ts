import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import {
  addCardio,
  deleteCardio,
  listCardio,
  updateCardio,
} from '@/data/repositories/cardioRepository';
import { weeklyCardio, type CardioEntry, type DatedCardio } from '@/domain/cardio';
import { todayIso } from '@/ui/useWeekPlan';

/** Every cardio entry, read once per launch and shared by the screens. */
const logs = ref<DatedCardio[]>([]);
let loading: Promise<void> | undefined;

async function load(): Promise<void> {
  const { db } = await openAppDatabase();
  logs.value = await listCardio(db);
}

export function useCardio() {
  loading ??= load().catch(() => {
    loading = undefined;
  });
  return {
    logs,
    reload: load,
    ofSession: (sessionId: string) => logs.value.filter((l) => l.sessionId === sessionId),
    week: computed(() => weeklyCardio(logs.value, todayIso())),
    /** The last entry on a machine, to start from last time. */
    lastOn: (cardioId: string) => logs.value.filter((l) => l.cardioId === cardioId).at(-1),
    async add(entry: CardioEntry, session?: { id: string; date: string }): Promise<DatedCardio> {
      const { db } = await openAppDatabase();
      const saved = await addCardio(db, {
        date: session?.date ?? todayIso(),
        ...(session ? { sessionId: session.id } : {}),
        entry,
      });
      logs.value = [...logs.value, saved];
      return saved;
    },
    async update(id: string, entry: CardioEntry): Promise<void> {
      const { db } = await openAppDatabase();
      await updateCardio(db, id, entry);
      logs.value = logs.value.map((l) =>
        l.id === id
          ? { id, date: l.date, ...(l.sessionId ? { sessionId: l.sessionId } : {}), ...entry }
          : l,
      );
    },
    async remove(id: string): Promise<void> {
      const { db } = await openAppDatabase();
      await deleteCardio(db, id);
      logs.value = logs.value.filter((l) => l.id !== id);
    },
  };
}
