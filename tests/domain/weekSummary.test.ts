import { describe, expect, it } from 'vitest';
import { weekSummary } from '@/domain/weekSummary';
import { octoberSessions } from '../fixtures/octoberSessions';

describe('summary of the week for the AI coach', () => {
  const summary = weekSummary({
    sessions: octoberSessions,
    today: '2026-10-24',
    sessionsPerWeek: 4,
    exerciseName: (id) => (id === 'leg-press' ? 'Presse à cuisses' : id),
    discomforts: [
      { date: '2026-10-22', zone: 'frontShoulder' },
      { date: '2026-10-01', zone: 'knee' },
    ],
  });

  it('lists the sessions of the last 7 days with their work sets', () => {
    expect(summary).toContain('Séances ces 7 derniers jours : 3.');
    expect(summary).toContain(
      'Presse à cuisses : 107 kg × 10 (ok), 107 kg × 10 (ok), 107 kg × 10 (hard)',
    );
    expect(summary).toContain('seated-row : 39 kg × 9 (hard, reps incomplètes), 32 kg × 12 (ok)');
    expect(summary).not.toContain('2026-10-17');
  });

  it('mentions recent discomforts only', () => {
    expect(summary).toContain('Gênes signalées : frontShoulder (2026-10-22).');
    expect(summary).not.toContain('knee');
  });

  it('stays well under the server limit', () => {
    expect(summary.length).toBeLessThan(4000);
  });
});
