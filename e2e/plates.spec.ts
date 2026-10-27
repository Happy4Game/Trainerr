import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('the plate calculator only uses the plates set for the gym', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.goto('/tabs/settings');
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Une paire de 25 kg en moins' }).click();
  }
  await expect(page.getByRole('button', { name: 'Une paire de 25 kg en moins' })).toBeDisabled();

  await page.goto('/tabs/session');
  await page.getByRole('link', { name: 'Voir les séances types' }).click();
  await page.getByRole('button', { name: 'Commencer : Push' }).click();
  const bench = page.getByRole('region', { name: 'Développé couché barre' });
  await expect(bench).toBeVisible();
  const skip = page.getByRole('button', { name: "Passer l'échauffement" });
  if (await skip.isVisible()) await skip.click();
  await bench.getByRole('button', { name: /Toucher pour la taper/ }).click();
  await bench.getByRole('textbox').fill('70');
  await bench.getByRole('textbox').press('Enter');
  // Shown under the load, without opening the calculator.
  await expect(bench.getByTestId('per-side')).toHaveText('Par côté : 20 + 5 kg');
  await bench.getByRole('button', { name: 'Disques', exact: true }).click();
  await expect(page.locator('ion-modal').getByText('Par côté : 20 + 5 kg')).toBeVisible();
});
