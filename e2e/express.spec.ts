import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function star(page: Page, search: string, name: string) {
  await page.getByRole('searchbox').fill(search);
  await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  await expect(page.getByRole('button', { name: `Retirer ${name} de mes machines` })).toBeVisible();
}

test('express workout: 3 exercises, curl and pushdown in a superset', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'poulie haute', 'Extension triceps à la poulie');
  await star(page, 'curl haltères', 'Curl biceps haltères');

  await page.getByRole('tab', { name: 'Séance' }).click();
  // Supersets are an option: off by default, switched on for this session.
  await page.getByRole('switch', { name: /Enchaîner en supersets/ }).click();
  await page.getByRole('button', { name: 'Séance express (20–30 min)' }).click();

  const correct = () => page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  for (let i = 0; i < 3; i++) await correct();

  // The change of machine is announced, then confirmed once on it.
  const next = page.getByRole('region', { name: 'Machine suivante' });
  await expect(next.getByText('✓ Développé épaules machine terminé')).toBeVisible();
  await expect(page.getByText('Exercice 2 sur 3')).toBeVisible();
  await next.getByRole('button', { name: 'Je suis sur la machine' }).click();

  const first = page.getByRole('region').filter({ hasText: /Superset [12]\/2/ });
  await expect(first).toBeVisible();
  const firstName = await first.getByRole('heading', { level: 2 }).innerText();
  await correct();
  // Straight to the partner, no rest timer between the two.
  await expect(page.getByRole('region', { name: firstName })).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByText(/Superset [12]\/2/)).toBeVisible();
  await correct();
  // Rest after the second exercise of the pair, then back to the first one.
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('region', { name: firstName })).toBeVisible();
});

test('an express session without supersets, and a superset split on the spot', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'poulie haute', 'Extension triceps à la poulie');
  await star(page, 'curl haltères', 'Curl biceps haltères');
  await page.getByRole('tab', { name: 'Séance' }).click();

  await page.getByRole('switch', { name: /Enchaîner en supersets/ }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByText(/Superset [12]\/2/)).toBeVisible();
  await page.getByRole('button', { name: /Séparer le superset avec/ }).click();
  await expect(page.getByText(/Superset [12]\/2/)).toHaveCount(0);
  // Rest after each set again.
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
});

test('the session plan shows the supersets as soon as they are switched on', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'poulie haute', 'Extension triceps à la poulie');
  await star(page, 'curl haltères', 'Curl biceps haltères');
  await page.getByRole('tab', { name: 'Séance' }).click();

  await expect(page.getByRole('group', { name: /Superset/ })).toHaveCount(0);
  await page.getByRole('switch', { name: /Enchaîner en supersets/ }).click();
  const pair = page.getByRole('group', { name: /Superset/ }).first();
  await expect(pair).toContainText('Curl biceps haltères');
  await expect(pair).toContainText('Extension triceps à la poulie');

  // During the session, each exercise says its place in the pair.
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByText(/Superset 1\/2/)).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByText(/Superset 2\/2/)).toBeVisible();
  await expect(page.getByText(/repos après cette série/)).toBeVisible();
});

test('switching supersets on says so when no pair is possible', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'curl haltères', 'Curl biceps haltères');
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('switch', { name: /Enchaîner en supersets/ }).click();
  await expect(page.getByText(/Pas de superset possible/).first()).toBeVisible();
});
