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
  await expect(page.getByText('Série 1 / 3')).toBeVisible();
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
  await expect(page.getByText('Série 2 / 3')).toBeVisible();
  const current = (await page.locator('section.entry h2').textContent())?.trim() ?? '';

  await page.getByRole('link', { name: `Voir la fiche de ${current}` }).click();
  // The card opens in the Session tab.
  await expect(page.getByRole('tab', { name: 'Séance', selected: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: current })).toBeVisible();
  await expect(page.getByRole('img', { name: /Illustration du mouvement/ })).toBeVisible();

  await page.getByRole('link', { name: '← Revenir à la séance' }).click();
  await expect(page.getByRole('region', { name: current })).toBeVisible();
  await expect(page.getByText('Série 2 / 3')).toBeVisible();
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
  await expect(page.getByText('Série 1 / 3')).toBeVisible();
});
