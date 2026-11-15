import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('a proposed warm-up set can be skipped alone, or the whole warm-up', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('Développé couché barre');
  await page.getByRole('button', { name: 'Ajouter Développé couché barre à mes machines' }).click();

  // A usual load: no test set, so the ramp of a heavy compound is proposed.
  await page.getByRole('tab', { name: 'Séance' }).click();
  const usual = page.getByRole('note').filter({ hasText: 'Tu connais déjà ta charge' });
  await usual.getByRole('button', { name: 'Noter ma charge sur Développé couché barre' }).click();
  await page.getByRole('textbox', { name: 'Charge (kg)' }).fill('60');
  await page.getByRole('textbox', { name: 'Reps' }).fill('10');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();

  await expect(page.getByText(/^Échauffement 1\/3/)).toBeVisible();
  await page.getByRole('button', { name: 'Passer cette série' }).click();
  await expect(page.getByText(/^Échauffement 2\/3/)).toBeVisible();
  // Kept with the session when the app is opened again.
  await page.reload();
  await expect(page.getByText(/^Échauffement 2\/3/)).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: "Passer l'échauffement", exact: true }).click();
  await expect(page.getByText(/^Échauffement \d\/3/)).toHaveCount(0);
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
});
