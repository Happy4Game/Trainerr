import { describe, expect, it } from 'vitest';
import { galleryId, phoneGalleryAvailable, takenAt } from '@/ui/body/phoneGallery';

describe('body photos in the phone gallery', () => {
  it('names each copy after the photo, with characters a file name accepts', () => {
    expect(galleryId('m-1a2b_3')).toBe('m-1a2b_3');
    expect(galleryId('a/b c.d')).toBe('a_b_c_d');
    expect(galleryId('x'.repeat(100))).toHaveLength(80);
  });

  it('dates the copy at noon of the photo day, so that Photos sorts it on that day', () => {
    const date = new Date(takenAt('2026-11-15'));
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 10, 15, 12,
    ]);
  });

  it('is not offered outside the Android app', async () => {
    await expect(phoneGalleryAvailable()).resolves.toBe(false);
  });
});
