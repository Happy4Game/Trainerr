import { expect, test } from '@playwright/test';
import { skipOnboarding, openCatalog } from './helpers';

test('each gym keeps its own favorite machines', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();
  await expect(
    page.getByRole('button', { name: 'Retirer Écarté à la machine de mes machines' }),
  ).toBeVisible();

  await page.goto('/tabs/settings');
  await page
    .getByRole('textbox', { name: 'Ajouter une salle', disabled: false })
    .fill('Salle en vacances');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Choisir Salle en vacances' })).toBeChecked();

  await openCatalog(page);
  await page.locator('ion-segment-button', { hasText: 'Mes machines' }).click();
  await expect(page.getByRole('status')).toHaveText('0 exercice');

  await page.goto('/tabs/settings');
  await page.getByRole('radio', { name: 'Choisir Ma salle' }).click();
  await openCatalog(page);
  await page.locator('ion-segment-button', { hasText: 'Mes machines' }).click();
  await expect(page.getByRole('status')).toHaveText('1 exercice');
});

test('home workout and joint warm-up, without any favorite machine', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: 'Séance' }).click();
  await expect(page.getByText(/Échauffement articulaire/)).toBeVisible({ timeout: 20_000 });
  await page.getByText(/Échauffement articulaire/).click();
  await expect(page.getByText('Cercles de bras')).toBeVisible();
  await expect(page.getByText(/Cycle 1, semaine 1 sur 5/)).toBeVisible();
  await page.getByRole('button', { name: 'Séance à la maison' }).click();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
});
