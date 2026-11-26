import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('the own warm-up button stays while the app proposes its warm-up, and counts nothing', async ({
  page,
}) => {
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

  // The app's ramp is shown, and a warm-up of one's own can still be saved, with its rest.
  await expect(page.getByText(/^Échauffement 1\/3/)).toBeVisible();
  await page.getByRole('button', { name: "C'était une série d'échauffement" }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();

  // The app's own warm-up set rests too.
  await page.getByRole('button', { name: 'Échauffement fait' }).click();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();

  // Three work sets, and only then the next machine.
  for (const next of ['Série 2 sur 3', 'Série 3 sur 3']) {
    await page.getByRole('button', { name: 'Série faite' }).click();
    await expect(page.getByText(next)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Série faite' }).click();
  await expect(page.getByText(/^Série \d sur 3$/)).toHaveCount(0);
});
