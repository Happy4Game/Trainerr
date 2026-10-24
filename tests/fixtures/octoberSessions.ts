import type { SessionLog } from '@/domain/types';

/**
 * Sessions of 15–24 October 2026, rebuilt from the real cases listed in SPEC.md
 * ("Cas de test"). The loads and outcomes come from the spec; the exact day of
 * each session and the filler sets are approximate.
 */
export const octoberSessions: readonly SessionLog[] = [
  {
    id: 's1',
    date: '2026-10-15',
    templateId: 'pushA',
    sets: [
      { exerciseId: 'db-bench', loadKg: 8, reps: 15, difficulty: 'easy', warmup: true },
      { exerciseId: 'db-bench', loadKg: 16, reps: 12, difficulty: 'ok' },
      { exerciseId: 'db-bench', loadKg: 18, reps: 9, difficulty: 'ok' },
      { exerciseId: 'db-bench', loadKg: 18, reps: 8, difficulty: 'hard' },
      { exerciseId: 'pec-fly', loadKg: 52, reps: 12, difficulty: 'ok' },
      { exerciseId: 'pec-fly', loadKg: 52, reps: 12, difficulty: 'ok' },
    ],
  },
  {
    id: 's2',
    date: '2026-10-16',
    templateId: 'pullA',
    sets: [
      { exerciseId: 'lat-pulldown', loadKg: 45, reps: 8, difficulty: 'hard', completeReps: false },
      { exerciseId: 'lat-pulldown', loadKg: 39, reps: 10, difficulty: 'ok' },
      { exerciseId: 'lat-pulldown', loadKg: 39, reps: 9, difficulty: 'ok' },
      { exerciseId: 'curl', loadKg: 9, reps: 10, difficulty: 'hard', slowTempo: true },
      { exerciseId: 'curl', loadKg: 8, reps: 12, difficulty: 'ok' },
    ],
  },
  {
    id: 's3',
    date: '2026-10-17',
    templateId: 'legsA',
    sets: [
      { exerciseId: 'leg-press', loadKg: 90, reps: 12, difficulty: 'easy' },
      { exerciseId: 'leg-press', loadKg: 100, reps: 10, difficulty: 'ok' },
      { exerciseId: 'leg-extension', loadKg: 52, reps: 8, difficulty: 'hard' },
    ],
  },
  {
    id: 's4',
    date: '2026-10-20',
    templateId: 'pushB',
    sets: [
      { exerciseId: 'shoulder-press', loadKg: 32, reps: 10, difficulty: 'ok' },
      { exerciseId: 'db-bench', loadKg: 18, reps: 10, difficulty: 'ok' },
    ],
  },
  {
    id: 's5',
    date: '2026-10-22',
    templateId: 'pullB',
    sets: [
      { exerciseId: 'seated-row', loadKg: 39, reps: 9, difficulty: 'hard', completeReps: false },
      { exerciseId: 'seated-row', loadKg: 32, reps: 12, difficulty: 'ok' },
      { exerciseId: 'curl', loadKg: 9, reps: 11, difficulty: 'ok' },
    ],
  },
  {
    id: 's6',
    date: '2026-10-24',
    templateId: 'legsB',
    sets: [
      { exerciseId: 'leg-press', loadKg: 107, reps: 10, difficulty: 'ok' },
      { exerciseId: 'leg-press', loadKg: 107, reps: 10, difficulty: 'ok' },
      { exerciseId: 'leg-press', loadKg: 107, reps: 10, difficulty: 'hard' },
    ],
  },
];
