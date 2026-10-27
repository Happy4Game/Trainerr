import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('no favorite machine: a pre-session with popular machines can be started', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();

  const readyMade = page.getByRole('region', { name: 'Pré-séance proposée' });
  await expect(readyMade).toBeVisible();
  await expect(readyMade.getByText(/Tu n'as aucune machine en favori/)).toBeVisible();
  await expect(readyMade.getByRole('listitem')).toHaveCount(5);

  await readyMade.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
});

test('one favorite: the pre-session keeps it, and the suggestions can be added to my machines', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();
  await page.getByRole('tab', { name: 'Séance' }).click();

  const readyMade = page.getByRole('region', { name: 'Pré-séance proposée' });
  await expect(readyMade.getByText(/Tu n'as qu'une machine en favori/)).toBeVisible();
  await expect(readyMade.getByText('Écarté à la machine')).toBeVisible();
  await readyMade
    .getByRole('button', { name: 'Ajouter les 4 machines proposées à mes machines' })
    .click();

  // Enough favorites now: the usual session, no more pre-session.
  await expect(readyMade).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Commencer la séance' })).toBeVisible();
});

test('during a session, the machine card opens and leads back to the session', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();
  const current = (await page.locator('section.entry h2').textContent())?.trim() ?? '';

  await page.getByRole('link', { name: `Voir la fiche de ${current}` }).click();
  // The card opens in the Session tab.
  await expect(page.getByRole('tab', { name: 'Séance', selected: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: current })).toBeVisible();
  await expect(page.getByRole('img', { name: /Illustration du mouvement/ })).toBeVisible();

  await page.getByRole('link', { name: '← Revenir à la séance' }).click();
  await expect(page.getByRole('region', { name: current })).toBeVisible();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();
});

test('an exercise skipped too fast can be reopened', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  const first = (await page.locator('section.entry h2').textContent())?.trim() ?? '';
  await page.getByRole('button', { name: 'Passer cet exercice' }).click();
  await expect(page.getByRole('region', { name: first })).toHaveCount(0);

  await page.getByRole('button', { name: `← Revenir à : ${first}` }).click();
  await expect(page.getByRole('region', { name: first })).toBeVisible();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
});

test('more sets than planned: during the exercise or right after it', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  const first = (await page.locator('section.entry h2').textContent())?.trim() ?? '';

  await page.getByRole('button', { name: 'Ajouter une série à cet exercice' }).click();
  await expect(page.getByText('Série 1 sur 4')).toBeVisible();
  for (let set = 1; set <= 4; set++) {
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
    if (set < 4) await page.getByRole('button', { name: 'Passer', exact: true }).click();
  }
  await expect(page.getByRole('region', { name: first })).toHaveCount(0);

  // A fifth one, right after: the exercise comes back, rest timer kept.
  // During the rest, these actions are folded under the timer.
  await page.getByText('Corriger, revenir… ›').click();
  await page.getByRole('button', { name: `+1 série sur : ${first}` }).click();
  await expect(page.getByRole('region', { name: first })).toBeVisible();
  await expect(page.getByText('Série 5 sur 5')).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
});

test('the session plan shows every machine and lets one be done now', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  await page.getByRole('button', { name: 'Voir le programme de la séance' }).click();
  const items = page.locator('ion-modal ol.overview > li');
  await expect(items).toHaveCount(5);
  const third = (await items.nth(2).locator('.name').textContent())?.trim() ?? '';
  await page.locator('ion-modal ion-button', { hasText: 'Maintenant' }).nth(1).click();
  await expect(page.getByRole('region', { name: third })).toBeVisible();
});

test('another exercise is added from the session plan, after the others', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  await page.getByRole('button', { name: 'Voir le programme de la séance' }).click();
  const items = page.locator('ion-modal ol.overview > li');
  await expect(items).toHaveCount(5);
  const first = (await items.first().locator('.name').textContent())?.trim() ?? '';

  await page
    .locator('ion-modal.show-modal')
    .getByRole('button', { name: 'Ajouter un exercice' })
    .click();
  await page.getByRole('search').last().getByRole('searchbox').fill('presse');
  await page
    .locator('ion-modal.show-modal')
    .getByRole('heading', { name: 'Presse à cuisses', exact: true })
    .click();

  // Last in the plan, with its sets; the current exercise goes on.
  await expect(items).toHaveCount(6);
  await expect(items.last()).toContainText('Presse à cuisses');
  await expect(items.last()).toContainText(/0 \/ \d+ séries/);
  await expect(items.first()).toContainText(first);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('region', { name: first })).toBeVisible();
});
