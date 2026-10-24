import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('settings lead to the getting started, about and credits pages', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await page.getByRole('button', { name: 'Réglages' }).click();

  await page.getByText('Bien débuter').click();
  await expect(page.getByText('La technique passe avant la charge')).toBeVisible();
  await expect(page.getByRole('link', { name: /Morton et al., 2018/ })).toBeVisible();
  await page.goBack();

  await page.getByText('À propos').click();
  await expect(
    page.getByText(/entièrement réalisée avec l'aide d'une intelligence artificielle/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Voir les crédits et les sources' }).click();

  await expect(page.getByRole('link', { name: 'free-exercise-db' })).toBeVisible();
  await expect(page.getByText('Everkinetic')).toBeVisible();
  await expect(page.getByText(/bibliothèques libres embarquées/)).toBeVisible();
});
