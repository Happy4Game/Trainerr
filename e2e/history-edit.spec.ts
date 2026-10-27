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
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
});

test('a past session can be corrected, completed and deleted', async ({ page }) => {
  const first = await doOneSet(page);
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  await page.getByRole('tab', { name: 'Progrès' }).click();
  await page.getByRole('link', { name: /Modifier Haut du corps A/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Haut du corps A' })).toBeVisible();

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
  // The list: the month, then one card per session, one line per exercise.
  await expect(page.getByRole('heading', { level: 2, name: /\d{4}/ })).toBeVisible();
  const exercises = page.getByRole('list', { name: 'Exercices de Haut du corps A' });
  await expect(exercises.getByRole('listitem').filter({ hasText: first })).toContainText(
    /× 8.*× 8/,
  );
  await expect(
    exercises.getByRole('listitem').filter({ hasText: 'Presse à cuisses' }),
  ).toBeVisible();
  await expect(page.getByText(/^2 exercices · /)).toBeVisible();

  await page.getByRole('link', { name: /Modifier Haut du corps A/ }).click();
  await page.getByRole('button', { name: 'Supprimer cette séance' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer la séance' }).click();
  await expect(page.getByText('Pas encore de séance terminée.')).toBeVisible();
});

test('a set validated too fast can be fixed or deleted during the session', async ({ page }) => {
  const first = await doOneSet(page);
  // Right after validating: the last set is shown with a way to fix it.
  await expect(page.getByText(/Dernière série : .*× 10/)).toBeVisible();
  // During the rest, the fix is folded under the timer.
  await page.getByText('Corriger, revenir… ›').click();
  await page.getByRole('button', { name: 'Corriger', exact: true }).click();
  await page.locator('ion-modal ion-button', { hasText: 'Une rep de moins' }).click();
  await page.locator('ion-modal ion-button', { hasText: 'Une rep de moins' }).click();
  await page.getByRole('button', { name: 'Enregistrer la correction' }).click();
  await expect(page.getByText(/Dernière série : .*× 8/)).toBeVisible();
  // Typed exactly too: a load between two steps, a half rep.
  await page.getByRole('button', { name: /^Corriger : .*× 8/ }).click();
  await page.getByRole('textbox', { name: 'Charge (kg)', disabled: false }).fill('7,5');
  await page.getByRole('textbox', { name: 'Reps', disabled: false }).fill('8,5');
  await page.getByRole('button', { name: 'Enregistrer la correction' }).click();
  await expect(page.getByText(/Dernière série : .*7,5 kg × 8,5/)).toBeVisible();
  await page.getByRole('button', { name: /^Corriger : .*× 8,5/ }).click();
  await page.getByRole('textbox', { name: 'Reps', disabled: false }).fill('8');
  await page.getByRole('button', { name: 'Enregistrer la correction' }).click();
  await expect(page.getByText(/Dernière série : .*× 8$/)).toBeVisible();

  // Finish the exercise, then delete one of its sets: it reopens.
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Passer', exact: true }).click();
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
  }
  await expect(page.getByRole('region', { name: 'Machine suivante' })).toBeVisible();
  // Newest set first: the corrected first set is now at the bottom of the list.
  const logged = page.locator('section.logged li');
  await expect(logged).toHaveCount(3);
  await expect(logged.last()).toContainText(/× 8 /);
  await expect(logged.first()).not.toContainText(/× 8 /);
  await page.getByRole('button', { name: new RegExp(`Corriger : ${first} .*× 8`) }).click();
  await page.getByRole('button', { name: 'Supprimer cette série' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  await expect(page.getByRole('region', { name: first })).toBeVisible();
  await expect(page.getByText('Série 3 sur 3')).toBeVisible();
});
