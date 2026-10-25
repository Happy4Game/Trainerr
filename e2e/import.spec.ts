import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

const STRONG = `Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE
2026-10-15 19:02:11;Push A;55m;Bench Press (Dumbbell);1;16;12;0;0;;;
2026-10-17 18:30:00;Legs A;48m;Leg Press;1;90;12;0;0;;;
2026-10-17 18:30:00;Legs A;48m;Burpees;1;0;10;0;0;;;`;

test('imports a Strong export after checking the exercise matches', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.goto('/tabs/settings');
  await page
    .locator('input[type=file][accept=".csv,text/csv"]')
    .setInputFiles({ name: 'strong.csv', mimeType: 'text/csv', buffer: Buffer.from(STRONG) });

  await expect(page.getByText("2 séance(s) trouvée(s) dans l'export Strong.")).toBeVisible();
  await expect(page.getByLabel('Leg Press', { exact: true })).toHaveValue('Leg_Press');
  // Nothing close to burpees in the catalog: skipped.
  await expect(page.getByLabel('Burpees')).toHaveValue('');
  await page.getByRole('button', { name: 'Importer 2 séances' }).click();
  await expect(page.getByText('2 séances importées.')).toBeVisible();

  await page.goto('/tabs/history');
  await expect(page.getByText(/Séance importée ·/)).toHaveCount(2, { timeout: 20_000 });
  await expect(page.getByText(/Presse à cuisses : 90 × 12/)).toBeVisible();
});
