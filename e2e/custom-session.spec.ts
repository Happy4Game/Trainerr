import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function addExercise(page: Page, search: string, name: RegExp) {
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('search').last().getByRole('searchbox').fill(search);
  await page.getByRole('button', { name }).first().click();
}

test('a custom session is created, reordered, started and kept in the history', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('link', { name: 'Créer une séance' }).click();

  const save = page.getByRole('button', { name: 'Enregistrer la séance' });
  await expect(save).toBeDisabled();
  await page.getByRole('textbox', { name: 'Nom de la séance' }).fill('Bras du vendredi');
  await addExercise(page, 'curl marteau', /Curl marteau/);
  await addExercise(page, 'pushdown', /Extension triceps à la poulie/);
  // The triceps goes first.
  await page.locator('ion-button', { hasText: 'Monter Extension triceps à la poulie' }).click();
  await expect(page.locator('ol.list li .name').first()).toHaveText(
    'Extension triceps à la poulie',
  );
  await save.click();

  const mine = page.getByRole('region', { name: 'Mes séances' });
  await expect(mine.getByText('Bras du vendredi')).toBeVisible();
  await expect(mine.getByText('2 exercices')).toBeVisible();
  await page.getByRole('button', { name: 'Commencer Bras du vendredi' }).click();
  await expect(page.getByText('Séance · Bras du vendredi')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Extension triceps à la poulie' })).toBeVisible();

  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();
  await page.getByRole('tab', { name: 'Historique' }).click();
  await expect(page.getByRole('heading', { name: /Bras du vendredi/ })).toBeVisible();
});
