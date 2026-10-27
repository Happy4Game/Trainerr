import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function oneSetSession(page: Page) {
  await page.getByRole('button', { name: 'Commencer Pecs' }).click();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();
}

test('the record to beat is shown, and beating it is celebrated', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('link', { name: 'Créer une séance' }).click();
  await page.getByRole('textbox', { name: 'Nom de la séance' }).fill('Pecs');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('search').last().getByRole('searchbox').fill('pec deck');
  await page
    .getByRole('button', { name: /Écarté à la machine/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Enregistrer la séance' }).click();

  // First session: nothing to beat yet.
  await oneSetSession(page);
  await expect(page.getByTestId('record')).toHaveCount(0);
  const first = (await page.getByTestId('load').textContent())?.trim() ?? '';
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  // Second session: the best set is the record to beat.
  await oneSetSession(page);
  await expect(page.getByTestId('record')).toContainText(`Record à battre : ${first} × `);
  await page.getByRole('button', { name: 'Palier plus lourd' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByText('Nouveau record !')).toBeVisible();
});
