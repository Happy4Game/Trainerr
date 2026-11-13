import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function star(page: Page, search: string, name: string) {
  await page.getByRole('searchbox').fill(search);
  await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
}

test('everything done, then 10 min without news: the session closes by itself', async ({
  page,
}) => {
  // A clock under the test's control: the 10 minutes go by in an instant.
  await page.clock.install();
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();

  // A discomfort removes the rest of the session: the last set is done.
  await page.getByRole('button', { name: 'Ça tire' }).click();
  await page.getByRole('button', { name: "Avant de l'épaule" }).click();
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.getByRole('button', { name: 'Compris' }).click();
  await expect(page.getByText('Tous les exercices sont faits. Bravo !')).toBeVisible();
  await expect(page.getByText(/se clôturera toute seule à \d\d:\d\d/)).toBeVisible();

  // 9 minutes: still open.
  await page.clock.fastForward('09:00');
  await expect(page.getByRole('button', { name: 'Terminer la séance' })).toBeVisible();

  // Past 10 minutes: closed, as with the button, and it says so.
  await page.clock.fastForward('01:30');
  await expect(page.getByText(/Séance clôturée automatiquement après 10 min/)).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).first().click();
  await page.getByRole('tab', { name: 'Progrès' }).click();
  await expect(page.getByRole('link', { name: /Modifier/ }).first()).toBeVisible();
});
