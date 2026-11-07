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
  await expect(page.getByText(/Un échauffement guidé de ≈ \d+ min t'attend/)).toBeVisible();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
}

test('the guided warm-up comes first, step by step, and is kept after a reload', async ({
  page,
}) => {
  await startSession(page);
  const warmup = page.getByRole('region', { name: 'Échauffement guidé' });
  await expect(warmup).toBeVisible();
  await expect(warmup.getByText(/^Étape 1 sur \d+$/)).toBeVisible();
  await expect(warmup.getByRole('heading', { name: 'Cardio léger' })).toBeVisible();
  // No machine before the warm-up is done or skipped.
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toHaveCount(0);

  // A timed step: the countdown starts on a tap and can be paused.
  await warmup.getByRole('button', { name: 'Lancer le minuteur' }).click();
  await expect(warmup.getByRole('timer')).toHaveAttribute('aria-label', /Temps restant 3:5\d/);
  await warmup.getByRole('button', { name: 'Pause' }).click();
  await expect(warmup.getByRole('button', { name: 'Reprendre' })).toBeVisible();

  // Push day: shoulder moves, then the upper body is woken up.
  await warmup.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(warmup.getByText(/^Étape 2 sur \d+$/)).toBeVisible();
  await expect(warmup.getByText('Mobiliser les articulations')).toBeVisible();
  await expect(warmup.getByRole('heading', { name: 'Cercles de bras' })).toBeVisible();

  // The step reached stays after the app is closed.
  await page.reload();
  await expect(warmup.getByText(/^Étape 2 sur \d+$/)).toBeVisible({ timeout: 20_000 });
  await warmup.getByRole('button', { name: 'Étape précédente' }).click();
  await expect(warmup.getByText(/^Étape 1 sur \d+$/)).toBeVisible();

  // To the end: the approach sets of the first machine finish it.
  await expect(async () => {
    await warmup.getByRole('button', { name: 'Étape suivante' }).click({ timeout: 1000 });
    await expect(warmup.getByRole('heading', { name: "Séries d'approche" })).toBeVisible({
      timeout: 500,
    });
  }).toPass();
  await expect(warmup.getByText('Pompes scapulaires')).toHaveCount(0);
  await warmup.getByRole('button', { name: 'Aller à la première machine' }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(warmup).toHaveCount(0);
});

test('the guided warm-up is skipped in one tap', async ({ page }) => {
  await startSession(page);
  await expect(page.getByRole('region', { name: 'Échauffement guidé' })).toBeVisible();
  await skipButton(page).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Échauffement guidé' })).toHaveCount(0);
});

test('the guided warm-up can be turned off in the settings', async ({ page }) => {
  await skipOnboarding(page);
  await page.removeLocatorHandler(skipButton(page));
  await page.goto('/tabs/settings');
  await page.getByRole('switch', { name: /Échauffement guidé en début de séance/ }).click();
  await openCatalog(page);
  await star(page, 'shoulder press', 'Développé épaules machine');
  await openTab(page, 'Séance');
  await expect(page.getByRole('button', { name: 'Commencer la séance' })).toBeVisible();
  await expect(page.getByText(/Un échauffement guidé/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Échauffement guidé' })).toHaveCount(0);
});
