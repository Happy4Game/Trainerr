import { describe, expect, it } from 'vitest';
import { buildCoachReport } from '@/data/content/coachReport';
import { octoberSessions } from '../fixtures/octoberSessions';

describe('report for a coach', () => {
  const html = buildCoachReport({
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
    },
    lang: 'fr-FR',
  });

  it('is a standalone page with the program and every set, newest first', () => {
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<h2>Programme</h2>');
    expect(html).toContain('Presse à cuisses — 107 kg × 10 (ok)');
    expect(html.indexOf('2026-10-24')).toBeLessThan(html.indexOf('2026-10-15'));
    expect(html).toContain('db-bench — 8 kg × 15 (échauffement)');
  });

  it('escapes the user text', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
