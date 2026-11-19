import { Capacitor, registerPlugin } from '@capacitor/core';
import { loadSettings } from '@/ui/useSettings';

/**
 * Body photos also in the phone's Photos app (Android 10+, off by default).
 *
 * The photos live in the app's database, in its internal storage: no gallery
 * ever reads it, so they are private by default and a `.nomedia` file would
 * change nothing. When the user turns the option on, a copy of each photo goes
 * to the "Trainerr" album through MediaStore (PhotoGalleryPlugin.java); turned
 * off, the copies are taken away.
 * https://developer.android.com/training/data-storage/shared/media
 */
interface PhotoGalleryPlugin {
  available(): Promise<{ available: boolean }>;
  save(options: { id: string; data: string; takenAt: number }): Promise<void>;
  remove(options: { id: string }): Promise<void>;
  removeAll(): Promise<{ left: number }>;
}

const PhotoGallery = registerPlugin<PhotoGalleryPlugin>('PhotoGallery');

export interface GalleryPhoto {
  readonly id: string;
  readonly date: string;
  readonly photo: string;
}

/** The copy's file name follows the id: letters, digits, `-` and `_` only. */
export const galleryId = (id: string): string => id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);

/** Noon of the photo's day, so that the Photos app sorts the copy on the right day. */
export function takenAt(date: string): number {
  return new Date(`${date}T12:00:00`).getTime();
}

let availability: Promise<boolean> | undefined;

/** Only in the Android app, from Android 10 on. */
export function phoneGalleryAvailable(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return Promise.resolve(false);
  availability ??= PhotoGallery.available()
    .then((r) => r.available)
    .catch(() => false);
  return availability;
}

async function enabled(): Promise<boolean> {
  return (await loadSettings()).photosInGallery === true && (await phoneGalleryAvailable());
}

async function save(photo: GalleryPhoto): Promise<void> {
  await PhotoGallery.save({
    id: galleryId(photo.id),
    data: photo.photo.replace(/^data:[^,]*,/, ''),
    takenAt: takenAt(photo.date),
  });
}

/** A photo added or its date changed: its copy follows, when the option is on. */
export async function copyToGallery(photo: GalleryPhoto): Promise<void> {
  if (!(await enabled())) return;
  await save(photo).catch(() => undefined);
}

/** A photo deleted in the app: its copy goes too. */
export async function removeFromGallery(id: string): Promise<void> {
  if (!(await enabled())) return;
  await PhotoGallery.remove({ id: galleryId(id) }).catch(() => undefined);
}

/** Option turned on: every photo of the app gets its copy. Answers how many were copied. */
export async function copyAllToGallery(photos: readonly GalleryPhoto[]): Promise<number> {
  let copied = 0;
  for (const photo of photos) {
    try {
      await save(photo);
      copied++;
    } catch {
      // One photo that fails does not stop the others.
    }
  }
  return copied;
}

/** Option turned off: the copies leave the Photos app. Answers how many could not be removed. */
export async function removeAllFromGallery(): Promise<number> {
  try {
    return (await PhotoGallery.removeAll()).left;
  } catch {
    return 0;
  }
}
