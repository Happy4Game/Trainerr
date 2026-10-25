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
