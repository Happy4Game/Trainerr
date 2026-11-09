import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

/** A backup from before the split: one leg session on "the" leg press, settings without the answer. */
const OLD_BACKUP = {
  app: 'trainerr',
  schemaVersion: 9,
  exportedAt: '2026-11-08T18:00:00.000Z',
  tables: {
    session: [
      {
        id: 's1',
        date: '2026-11-02',
        template: 'legs',
        status: 'done',
        gym_id: null,
        note: null,
        plan: JSON.stringify({
          exercises: [{ exerciseId: 'Leg_Press', sets: 1 }],
          queue: { pending: [], waiting: [], done: ['Leg_Press'] },
        }),
      },
    ],
    set_log: [
      {
        id: 'l1',
        session_id: 's1',
        exercise_id: 'Leg_Press',
        position: 1,
        load_kg: 80,
        reps: 12,
        difficulty: 'ok',
        warmup: 0,
        slow_tempo: 0,
        complete_reps: 1,
        discomfort_zone: null,
      },
    ],
  },
  meta: { settings: JSON.stringify({ onboarded: true }) },
};

test('after the leg press is split, the old sets go to the machine really used', async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  await page.locator('input[type=file][accept="application/json,.json"]').setInputFiles({
    name: 'sauvegarde.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(OLD_BACKUP)),
  });

  const intro = page.getByText(/La presse à cuisses existe en deux machines/);
  await expect(intro).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^Presse à cuisses horizontale/ }).click();
  await expect(intro).toBeHidden();

  await page.goto('/tabs/history');
  await expect(
    page
      .getByRole('list', { name: /Exercices de/ })
      .getByRole('listitem')
      .filter({ hasText: 'Presse à cuisses horizontale' }),
  ).toContainText('80 kg × 12', { timeout: 20_000 });

  // Answered once: not asked again at the next launch.
  await page.reload();
  await expect(page.getByRole('list', { name: /Exercices de/ }).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('Une machine devient deux')).toBeHidden();
});
