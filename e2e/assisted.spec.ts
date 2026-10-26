import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('assisted pull-ups: the help counts backwards, less help is progress', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('gravitron');
  await page.getByRole('button', { name: 'Ajouter Tractions assistées à mes machines' }).click();

  // Body weight in the profile.
  await page.goto('/tabs/settings');
  const weight = page.getByRole('textbox', { name: 'Poids du corps (kg)', disabled: false });
  await weight.fill('80');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Poids enregistré.')).toBeVisible();

  await page.goto('/tabs/session');
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  const entry = page.getByRole('region', { name: 'Tractions assistées' });
  await expect(entry).toBeVisible();
  await expect(entry.getByText('Aide', { exact: true })).toBeVisible();
  // First time: the most help, i.e. the lightest real load.
  await expect(entry.getByTestId('load')).toHaveText('75 kg');
  await expect(entry.getByTestId('real-load')).toHaveText(
    "Charge réelle : 5 kg (80 kg de poids du corps − 75 kg d'aide)",
  );

  await page.getByRole('button', { name: 'Facile', exact: true }).click();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  // An easy set: the next one has less help, shown as progress.
  await expect(entry.getByText(/Baisse l'aide : 70 kg × \d+/)).toBeVisible();
  await expect(entry.getByTestId('load')).toHaveText('70 kg');
  await expect(entry.getByTestId('real-load')).toContainText('Charge réelle : 10 kg');
  await entry.getByRole('button', { name: "Moins d'aide (plus dur)" }).click();
  await expect(entry.getByTestId('load')).toHaveText('65 kg');
});
