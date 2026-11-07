import { expect, test, type Page } from '@playwright/test';
import { openCatalog, openTab, skipOnboarding } from './helpers';

async function star(page: Page, search: string, name: string) {
  await page.getByRole('searchbox').fill(search);
  await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  await expect(page.getByRole('button', { name: `Retirer ${name} de mes machines` })).toBeVisible();
}

const skipButton = (page: Page) =>
  page.getByRole('button', { name: "Passer l'échauffement guidé", exact: true });

async function startSession(page: Page) {
  await skipOnboarding(page);
  // This file is about the warm-up: the other tests skip it, not this one.
  await page.removeLocatorHandler(skipButton(page));
  await openCatalog(page);
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');
  await openTab(page, 'Séance');
  await expect(
    page.getByText(/l'appli te guide pendant ≈ \d+ min d'échauffement articulaire/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
}

test('the joint warm-up comes first, move by move, and is kept after a reload', async ({
  page,
}) => {
  await startSession(page);
  const warmup = page.getByRole('region', { name: 'Échauffement articulaire' });
  await expect(warmup).toBeVisible();
  await expect(warmup.getByText(/^Mouvement 1 sur \d+$/)).toBeVisible();
  // Push day: shoulder moves first.
  await expect(warmup.getByRole('heading', { name: 'Cercles de bras' })).toBeVisible();
  // No machine before the warm-up is done or skipped.
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toHaveCount(0);

  // The countdown starts on a tap and can be paused.
  await warmup.getByRole('button', { name: 'Lancer le minuteur' }).click();
  await expect(warmup.getByRole('timer')).toHaveAttribute('aria-label', /Temps restant 0:[0-5]\d/);
  await warmup.getByRole('button', { name: 'Pause' }).click();
  await expect(warmup.getByRole('button', { name: 'Reprendre' })).toBeVisible();

  await warmup.getByRole('button', { name: 'Mouvement suivant' }).click();
  await expect(warmup.getByText(/^Mouvement 2 sur \d+$/)).toBeVisible();

  // The move reached stays after the app is closed.
  await page.reload();
  await expect(warmup.getByText(/^Mouvement 2 sur \d+$/)).toBeVisible({ timeout: 20_000 });
  await warmup.getByRole('button', { name: 'Mouvement précédent' }).click();
  await expect(warmup.getByText(/^Mouvement 1 sur \d+$/)).toBeVisible();

  // To the end, then the first machine.
  const finish = warmup.getByRole('button', { name: 'Aller à la première machine' });
  await expect(async () => {
    if (await finish.isVisible()) return;
    await warmup.getByRole('button', { name: 'Mouvement suivant' }).click({ timeout: 1000 });
    await expect(finish).toBeVisible({ timeout: 500 });
  }).toPass();
  await finish.click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(warmup).toHaveCount(0);
});

test('the guided warm-up is skipped in one tap', async ({ page }) => {
  await startSession(page);
  await expect(page.getByRole('region', { name: 'Échauffement articulaire' })).toBeVisible();
  await skipButton(page).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Échauffement articulaire' })).toHaveCount(0);
});

test('"I prefer to warm up on my own" stops the guided warm-up', async ({ page }) => {
  await skipOnboarding(page);
  await page.removeLocatorHandler(skipButton(page));
  await openCatalog(page);
  await star(page, 'shoulder press', 'Développé épaules machine');
  await openTab(page, 'Séance');
  await page.getByRole('switch', { name: /Je préfère m'échauffer seul/ }).click();
  await expect(page.getByText(/ne propose plus l'échauffement guidé/)).toBeVisible();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Échauffement articulaire' })).toHaveCount(0);
  // Kept in the settings for the next sessions.
  await page.goto('/tabs/settings');
  await expect(page.getByRole('switch', { name: /Je préfère m'échauffer seul/ })).toBeChecked();
});
