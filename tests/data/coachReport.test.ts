import { describe, expect, it } from 'vitest';
import { buildCoachReport, type CoachReportInput } from '@/data/content/coachReport';
import { octoberSessions } from '../fixtures/octoberSessions';

describe('report for a coach', () => {
  const input: CoachReportInput = {
    generatedOn: '2026-10-25',
    program: [
      ['Modèle', 'Push / Pull / Legs'],
      ['Note', '<script>alert(1)</script>'],
    ],
    sessions: octoberSessions,
    exerciseName: (id) => (id === 'leg-press' ? 'Presse à cuisses' : id),
    templateName: (id) => id,
    loadLabel: (kg) => `${kg} kg`,
    difficultyLabel: (d) => d,
    texts: {
      title: 'Mon programme',
      program: 'Programme',
      history: 'Historique',
      warmup: 'échauffement',
      note: 'Généré par Trainerr',
      rest: (time) => `repos ${time}`,
      averageRest: (time) => `repos moyen ${time}`,
    },
    lang: 'fr-FR',
  };
  const html = buildCoachReport(input);

  it('is a standalone page with the program and every set, newest first', () => {
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<h2>Programme</h2>');
    expect(html).toContain('Presse à cuisses — 107 kg × 10 (ok)');
    expect(html.indexOf('2026-10-24')).toBeLessThan(html.indexOf('2026-10-15'));
    expect(html).toContain('db-bench — 8 kg × 15 (échauffement)');
  });

  it('shows the rest really taken before each set, and its average per session', () => {
    const report = buildCoachReport({
      ...input,
      sessions: [
        {
          id: 'r',
          date: '2026-10-29',
          templateId: 'pushA',
          sets: [
            { exerciseId: 'db-bench', loadKg: 16, reps: 12, difficulty: 'ok', doneAt: 0 },
            { exerciseId: 'db-bench', loadKg: 18, reps: 10, difficulty: 'ok', doneAt: 95_000 },
            { exerciseId: 'db-bench', loadKg: 18, reps: 9, difficulty: 'hard', doneAt: 240_000 },
          ],
        },
      ],
    });
    expect(report).toContain('<h3>2026-10-29 · pushA · repos moyen 2:00</h3>');
    expect(report).toContain('db-bench — 16 kg × 12 (ok)</li>');
    expect(report).toContain('db-bench — 18 kg × 10 (ok) · repos 1:35</li>');
    expect(report).toContain('db-bench — 18 kg × 9 (hard) · repos 2:25</li>');
  });

  it('says nothing about rest when it is not known', () => {
    expect(html).not.toContain('repos');
  });

  it('escapes the user text', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
