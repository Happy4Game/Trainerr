import { expect, test } from '@playwright/test';
import { openTab, skipOnboarding } from './helpers';

test('the guided stretches start from Today, change sides and follow each other alone', async ({
  page,
}) => {
  await skipOnboarding(page);
  await openTab(page, "Aujourd'hui");
  await page.getByRole('link', { name: "S'étirer (≈ 8 min)" }).click();
  await expect(page).toHaveURL(/\/stretching$/);
  await expect(page.getByText(/Rien n'est enregistré/).first()).toBeVisible();
  await expect(page.getByText(/Pas juste avant la muscu/)).toBeVisible();

  // A fake clock: the minutes pass in an instant (https://playwright.dev/docs/clock).
  await page.clock.install();
  await page.reload();
  await page.getByRole('button', { name: 'Commencer les étirements' }).click();
  const guided = page.getByRole('region', { name: 'Étirements guidés' });
  await expect(guided.getByText('Étirement 1 sur 8')).toBeVisible();
  await expect(guided.getByRole('heading', { name: 'Pectoraux contre un mur' })).toBeVisible();
  // No licensed drawing: the muscles stretched, on the body map.
  await expect(guided.getByText(/^Muscles étirés : Pectoraux/)).toBeVisible();
  await expect(guided.getByText("30 s d'un côté, puis 30 s de l'autre")).toBeVisible();

  await guided.getByRole('button', { name: 'Lancer le minuteur' }).click();
  await expect(guided.getByText('Premier côté')).toBeVisible();
  await page.clock.runFor(31_000);
  await expect(guided.getByText('Bip : change de côté')).toBeVisible();
  // At the end, the next stretch starts on its own.
  await page.clock.runFor(30_000);
  await expect(guided.getByText('Étirement 2 sur 8')).toBeVisible();
  await expect(guided.getByText('Muscles étirés : Arrière des épaules, Haut du dos')).toBeVisible();
  await expect(guided.getByRole('button', { name: 'Pause' })).toBeVisible();

  await guided.getByRole('button', { name: 'Étirement précédent' }).click();
  await expect(guided.getByText('Étirement 1 sur 8')).toBeVisible();

  // To the end, then back to Today.
  const finish = guided.getByRole('button', { name: 'Terminer les étirements' });
  await expect(async () => {
    if (await finish.isVisible()) return;
    await guided.getByRole('button', { name: 'Étirement suivant' }).click({ timeout: 1000 });
    await expect(finish).toBeVisible({ timeout: 500 });
  }).toPass();
  await finish.click();
  await expect(page.getByText('Étirements terminés. Bien joué !')).toBeVisible();
  await page.getByRole('status').getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/\/tabs\/today$/);
});

test('the guided stretches show a credited drawing and stop in one tap', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/stretching');
  await page.getByRole('button', { name: 'Commencer les étirements' }).click();
  // Third stretch: a freely licensed drawing, credited (one author, Wikimedia Commons).
  const guided = page.getByRole('region', { name: 'Étirements guidés' });
  for (const step of [2, 3]) {
    await guided.getByRole('button', { name: 'Étirement suivant' }).click();
    await expect(guided.getByText(`Étirement ${step} sur 8`)).toBeVisible();
  }
  await expect(guided.getByText(/Vidralta/)).toBeVisible();
  await page.getByRole('button', { name: 'Arrêter les étirements' }).click();
  await expect(page).toHaveURL(/\/tabs\/today$/);
});
