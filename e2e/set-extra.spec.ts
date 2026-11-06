import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('the reps in reserve of the button and a note are kept in the history', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();

  await page.getByText('Préciser la série').click();
  await page.getByRole('textbox', { name: 'Note sur la série' }).fill('Prise qui glisse');
  await page.getByRole('button', { name: '2 en réserve : Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  await page.getByRole('tab', { name: 'Progrès' }).click();
  await page.getByRole('link', { name: /Modifier Haut du corps A/ }).click();
  await expect(page.getByText('2 reps en réserve')).toBeVisible();
  await expect(page.getByText('Prise qui glisse')).toBeVisible();
});
