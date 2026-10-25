import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

/** A finished session: one set of the first exercise of the pre-session. */
async function doOneSet(page: Page): Promise<string> {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  const first = (await page.locator('section.entry h2').textContent())?.trim() ?? '';
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  return first;
}

test('an exercise added by hand during the session is done now', async ({ page }) => {
  await doOneSet(page);
  await page.getByRole('button', { name: '+ Ajouter un exercice' }).click();
  await page
    .getByRole('search', { name: 'Chercher une machine ou un muscle' })
    .last()
    .getByRole('searchbox')
    .fill('presse');
  await page
    .getByRole('button', { name: /Presse à cuisses/ })
    .first()
    .click();
  await expect(page.getByRole('region', { name: /Presse à cuisses/ })).toBeVisible();
  await expect(page.getByText('Série 1 / 3')).toBeVisible();
});

test('a past session can be corrected, completed and deleted', async ({ page }) => {
  const first = await doOneSet(page);
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  await page.getByRole('tab', { name: 'Historique' }).click();
  await page.getByRole('link', { name: /Modifier Haut du corps A/ }).click();
  await expect(page.getByRole('heading', { name: 'Haut du corps A' })).toBeVisible();

  // Wrong reps typed during the session.
  const set1 = page.getByRole('group', { name: `Série 1 : ${first}` });
  await set1.getByRole('spinbutton', { name: 'Reps' }).fill('8');
  await set1.getByRole('spinbutton', { name: 'Reps' }).press('Enter');
  await set1.getByRole('spinbutton', { name: 'Reps' }).blur();

  // A forgotten set, and a forgotten exercise.
  await page.getByRole('button', { name: 'Ajouter une série' }).click();
  await expect(page.getByRole('group', { name: `Série 2 : ${first}` })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page
    .getByRole('search', { name: 'Chercher une machine ou un muscle' })
    .last()
    .getByRole('searchbox')
    .fill('presse');
  await page
    .getByRole('button', { name: /Presse à cuisses/ })
    .first()
    .click();
  await expect(page.getByRole('group', { name: /Série 1 : Presse à cuisses/ })).toBeVisible();

  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page.getByText(new RegExp(`${first} : .*× 8, .*× 8`))).toBeVisible();
  await expect(page.getByText(/Presse à cuisses :/)).toBeVisible();

  await page.getByRole('link', { name: /Modifier Haut du corps A/ }).click();
  await page.getByRole('button', { name: 'Supprimer cette séance' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer la séance' }).click();
  await expect(page.getByText('Pas encore de séance terminée.')).toBeVisible();
});
