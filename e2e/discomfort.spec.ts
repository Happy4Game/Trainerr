import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function star(page: Page, search: string, name: string) {
  await page.getByRole('searchbox').fill(search);
  await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
}

test('real case: shoulder press, front shoulder discomfort → remaining push exercises removed', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');
  await star(page, 'poulie haute', 'Extension triceps à la poulie');

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();

  await page.getByRole('button', { name: 'Ça tire' }).click();
  await page.getByRole('button', { name: "Avant de l'épaule" }).click();
  await page.getByRole('button', { name: 'Valider' }).click();

  await expect(page.getByText('3 exercices retirés de la séance.')).toBeVisible();
  await expect(page.getByText(/Si la douleur devient vive/)).toBeVisible();
  await page.getByRole('button', { name: 'Compris' }).click();
  await expect(page.getByText('Tous les exercices sont faits. Bravo !')).toBeVisible();
});

test('warning signs stop the session', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'pec deck', 'Écarté à la machine');
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();

  await page.getByRole('button', { name: 'Ça tire' }).click();
  await page.getByRole('button', { name: 'Coude' }).click();
  await page.getByText('Fourmillements').click();
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByRole('alert')).toContainText('Arrête la séance maintenant');
});
