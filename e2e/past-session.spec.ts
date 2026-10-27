import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('a session done without the app is added to the history afterwards', async ({ page }) => {
  // Two days ago (a fixed clock would also freeze Ionic's taps).
  const day = new Date(Date.now() - 2 * 86_400_000);
  const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Progrès' }).click();

  await page.getByRole('button', { name: "Ajouter une séance faite sans l'appli" }).click();
  const form = page.getByRole('region', { name: "Séance faite sans l'appli" });
  await form.getByLabel('Date').fill(iso);
  await form.getByRole('button', { name: 'Créer et remplir' }).click();

  // The editor of the history, empty for now.
  await expect(page.getByRole('heading', { level: 1, name: 'Haut du corps A' })).toBeVisible();
  await expect(page.getByText('Ajoute les exercices que tu as faits.')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('search').last().getByRole('searchbox').fill('presse');
  // The catalog page behind has its own "Presse à cuisses" buttons: pick in the sheet.
  await page
    .locator('ion-modal.show-modal')
    .getByRole('heading', { name: 'Presse à cuisses', exact: true })
    .click();
  const set = page.getByRole('group', { name: /Série 1 : Presse à cuisses/ });
  await set.getByRole('spinbutton').first().fill('100');
  await set.getByRole('spinbutton').first().blur();

  await page.getByRole('button', { name: 'Retour' }).click();
  const exercises = page.getByRole('list', { name: 'Exercices de Haut du corps A' });
  await expect(exercises).toContainText('100 kg × 10');
  await expect(
    page.getByRole('link', {
      name: new RegExp(`^Modifier Haut du corps A · \\S+ ${day.getDate()} `),
    }),
  ).toBeVisible();

  // The same type again: it starts from that session, only the changes are typed.
  await page.getByRole('button', { name: "Ajouter une séance faite sans l'appli" }).click();
  // It moved the cycle on: the next type proposed is the following one.
  const type = form.getByRole('button', { name: /^Type de séance/ });
  await expect(type).toHaveAccessibleName('Type de séance, Bas du corps A');
  await form.locator('ion-select').click();
  await page.locator('ion-action-sheet button', { hasText: 'Haut du corps A' }).click();
  await expect(page.getByText(/reprend les exercices, charges et reps/)).toBeVisible();
  await form.getByRole('button', { name: 'Créer et remplir' }).click();
  await expect(page.getByRole('group', { name: /Série 1 : Presse à cuisses/ })).toBeVisible();
});

test('a session added but left empty is not kept', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Progrès' }).click();
  await page.getByRole('button', { name: "Ajouter une séance faite sans l'appli" }).click();
  await page.getByRole('button', { name: 'Créer et remplir' }).click();
  await expect(page.getByText('Ajoute les exercices que tu as faits.')).toBeVisible();
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page.getByText('Pas encore de séance terminée.')).toBeVisible();
});
