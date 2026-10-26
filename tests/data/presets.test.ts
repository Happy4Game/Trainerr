import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@/data/catalog/catalog';
import { PRESET_MODELS, presetSession } from '@/data/content/presetSessions';
import { orderIssues } from '@/domain/exerciseOrder';
import { resolvePreset } from '@/domain/presets';
import fr from '@/i18n/locales/fr-FR.json';

const catalog = new Map(buildCatalog().map((e) => [e.id, e]));
const sessions = PRESET_MODELS.flatMap((m) => m.sessions);
const RANK = { mainCompound: 0, secondaryCompound: 1, isolation: 2 };

describe('ready-made sessions', () => {
  it('are the 5 models asked for, Upper / Lower with its two days', () => {
    expect(PRESET_MODELS.map((m) => m.id)).toEqual([
      'push',
      'pull',
      'legs',
      'fullBodyBeginner',
      'upperLower',
    ]);
    expect(PRESET_MODELS.at(-1)?.sessions.map((s) => s.id)).toEqual(['upper', 'lower']);
    expect(presetSession('lower')?.exercises).toEqual(presetSession('legs')?.exercises);
  });

  it.each(sessions.map((s) => [s.id, s] as const))(
    '%s only uses catalog exercises and explains each place',
    (_id, session) => {
      for (const line of session.exercises) {
        for (const id of [line.exerciseId, ...(line.alternatives ?? [])]) {
          expect(catalog.has(id), id).toBe(true);
        }
        expect(fr.presets.why).toHaveProperty(line.why);
      }
    },
  );

  it.each(sessions.map((s) => [s.id, s] as const))(
    '%s goes heavy compound → secondary compound → isolation',
    (_id, session) => {
      const ranks = session.exercises.map((line) => RANK[line.role]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      const exercises = session.exercises.flatMap((line) => catalog.get(line.exerciseId) ?? []);
      expect(exercises).toHaveLength(session.exercises.length);
      // Never an isolation exercise before the compound of its muscle.
      expect(orderIssues(exercises)).toEqual([]);
    },
  );

  it('uses my machine for a movement when it is an alternative', () => {
    const pull = presetSession('pull');
    if (!pull) throw new Error('Pull session missing');
    const resolved = resolvePreset(pull, {
      isFavorite: (id) => id === 'trainerr:assisted-pullup',
      exists: (id) => catalog.has(id),
    });
    expect(resolved[0]?.chosenId).toBe('trainerr:assisted-pullup');
    expect(resolved[1]?.chosenId).toBe('Bent_Over_Barbell_Row');
  });
});
