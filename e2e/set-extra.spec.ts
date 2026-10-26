import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('reps in reserve and a note can be added to a set, and are kept in the history', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();

  await page.getByText('Préciser la série').click();
  await page.getByRole('radio', { name: '2 reps en réserve' }).click();
  await page.getByRole('textbox', { name: 'Note sur la série' }).fill('Prise qui glisse');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  await page.getByRole('tab', { name: 'Historique' }).click();
  await page.getByRole('link', { name: /Modifier Haut du corps A/ }).click();
  await expect(page.getByText('2 reps en réserve')).toBeVisible();
  await expect(page.getByText('Prise qui glisse')).toBeVisible();
});
