import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
});

test('a warm-up set done on the work machine does not count among its sets', async ({ page }) => {
  await expect(page.getByText(/^Série 1 sur \d+$/)).toBeVisible();
  const total = (await page.getByText(/^Série 1 sur \d+$/).textContent())?.match(/\d+$/)?.[0];

  await page.getByRole('button', { name: "C'était une série d'échauffement" }).click();
  // Still the first set to do, on the same machine.
  await expect(page.getByText(`Série 1 sur ${total}`)).toBeVisible();
  await expect(page.getByText(/· échauffement/)).toBeVisible();

  // Once a work set is done, the button goes away: warm-ups come first.
  await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();
  await expect(page.getByText(`Série 2 sur ${total}`)).toBeVisible();
  await expect(page.getByRole('button', { name: "C'était une série d'échauffement" })).toBeHidden();
});

test('a set saved as a work set can be marked as a warm-up afterwards', async ({ page }) => {
  await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();
  await expect(page.getByText(/^Série 2 sur \d+$/)).toBeVisible();
  const total = (await page.getByText(/^Série 2 sur \d+$/).textContent())?.match(/\d+$/)?.[0];

  await page
    .getByRole('button', { name: /^Corriger :/ })
    .first()
    .click();
  await page.locator('ion-toggle', { hasText: "Série d'échauffement" }).click();
  await page.getByRole('button', { name: 'Enregistrer la correction' }).click();

  await expect(page.getByText(`Série 1 sur ${total}`)).toBeVisible();
  await expect(page.getByText(/· échauffement/)).toBeVisible();
});
