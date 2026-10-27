import { describe, expect, it } from 'vitest';
import {
  importedPhotoDate,
  lastPhotoOfPose,
  photoComparison,
  photosOfPose,
  photoTimeline,
  type DatedPhoto,
} from '@/domain/photos';

const photos: DatedPhoto[] = [
  { id: 'a', date: '2026-09-01', pose: 'front' },
  { id: 'b', date: '2026-09-29', pose: 'side' },
  { id: 'c', date: '2026-10-27', pose: 'front' },
  { id: 'd', date: '2026-10-05' },
];
const sessions = ['2026-08-30', '2026-09-03', '2026-09-10', '2026-10-01', '2026-10-27'];

describe('photo gallery', () => {
  it('groups by month, newest first, with the sessions done and the weeks since the first photo', () => {
    const months = photoTimeline(photos, sessions);
    expect(months.map((m) => m.month)).toEqual(['2026-10', '2026-09']);
    expect(months[0]?.photos.map((p) => [p.photo.id, p.sessions, p.weeks])).toEqual([
      ['c', 5, 8],
      ['d', 4, 4],
    ]);
    expect(months[1]?.photos.map((p) => [p.photo.id, p.sessions, p.weeks])).toEqual([
      ['b', 3, 4],
      ['a', 1, 0],
    ]);
  });

  it('keeps a pose, with untagged photos in every pose', () => {
    expect(photosOfPose(photos, 'front').map((p) => p.id)).toEqual(['a', 'c', 'd']);
    expect(photosOfPose(photos, undefined)).toHaveLength(4);
  });

  it('compares the first and last photo, with the weeks and sessions between them', () => {
    const front = photosOfPose(photos, 'front').filter((p) => p.pose);
    expect(photoComparison(front, sessions)).toMatchObject({
      before: { id: 'a' },
      after: { id: 'c' },
      weeks: 8,
      sessions: 4,
    });
    expect(photoComparison(photos.slice(0, 1), sessions)).toBeUndefined();
  });

  it('dates an imported photo from its file, never in the future', () => {
    const local = new Date(2026, 8, 12, 10).getTime();
    expect(importedPhotoDate(local, '2026-10-27')).toBe('2026-09-12');
    expect(importedPhotoDate(new Date(2030, 0, 1).getTime(), '2026-10-27')).toBe('2026-10-27');
    expect(importedPhotoDate(0, '2026-10-27')).toBe('2026-10-27');
  });
});

describe('camera overlay', () => {
  it('shows the newest photo of each pose', () => {
    const shots = photos.map((p) => ({ ...p, photo: `data:${p.id}` }));
    expect(lastPhotoOfPose(shots)).toEqual({ front: 'data:c', side: 'data:b' });
  });
});
