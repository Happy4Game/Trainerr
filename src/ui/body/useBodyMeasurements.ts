import { computed, ref } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import {
  addMeasurement,
  deleteMeasurement,
  listMeasurements,
  updatePhoto,
  type BodyMeasurement,
} from '@/data/repositories/bodyRepository';
import type { PhotoPose } from '@/domain/photos';
import type { IsoDate } from '@/domain/types';

/** A measurement that holds a body photo. */
export type BodyPhoto = BodyMeasurement & { readonly photo: string };

/**
 * Weighings, measurements and body photos, shared by the Body tab and the
 * gallery. Each screen kept its own copy before, read once: a photo added or
 * removed in the gallery did not change the count shown on the Body tab.
 */
const measurements = ref<BodyMeasurement[]>([]);

const byDate = (a: BodyMeasurement, b: BodyMeasurement) => a.date.localeCompare(b.date);

/** Read again from the database: after a CSV import or a restored backup too. */
async function reload(): Promise<void> {
  const { db } = await openAppDatabase();
  measurements.value = await listMeasurements(db);
}

async function add(input: Omit<BodyMeasurement, 'id'>): Promise<BodyMeasurement> {
  const { db } = await openAppDatabase();
  const saved = await addMeasurement(db, input);
  measurements.value = [...measurements.value, saved].sort(byDate);
  return saved;
}

async function remove(id: string): Promise<BodyMeasurement | undefined> {
  const removed = measurements.value.find((m) => m.id === id);
  const { db } = await openAppDatabase();
  await deleteMeasurement(db, id);
  measurements.value = measurements.value.filter((m) => m.id !== id);
  return removed;
}

async function changePhoto(
  id: string,
  change: { readonly date: IsoDate; readonly pose?: PhotoPose },
): Promise<void> {
  const { db } = await openAppDatabase();
  await updatePhoto(db, id, change);
  measurements.value = measurements.value
    .map((m) => {
      if (m.id !== id) return m;
      const { pose: _old, ...rest } = m;
      return { ...rest, date: change.date, ...(change.pose ? { pose: change.pose } : {}) };
    })
    .sort(byDate);
}

const photos = computed(() => measurements.value.filter((m): m is BodyPhoto => !!m.photo));

export function useBodyMeasurements() {
  return { measurements, photos, reload, add, remove, changePhoto };
}
