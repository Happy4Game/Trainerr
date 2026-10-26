import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('export a backup, then delete everything after a confirmation', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter une sauvegarde (JSON)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^trainerr-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole('button', { name: 'Supprimer toutes mes données' }).click();
  await expect(page.getByRole('alertdialog')).toContainText("Ce n'est pas réversible");
  await page.getByRole('button', { name: 'Oui, tout supprimer' }).click();

  // Settings gone too: back to the first-launch questionnaire.
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
});
