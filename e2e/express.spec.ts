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
  await page.getByRole('button', { name: 'Séance express (20–30 min)' }).click();

  const correct = () => page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  for (let i = 0; i < 3; i++) await correct();

  // The change of machine is announced, then confirmed once on it.
  const next = page.getByRole('region', { name: 'Machine suivante' });
  await expect(next.getByText('✓ Développé épaules machine terminé')).toBeVisible();
  await expect(page.getByText('Exercice 2 sur 3')).toBeVisible();
  await next.getByRole('button', { name: 'Je suis sur la machine' }).click();

  const first = page.getByRole('region').filter({ hasText: /Superset avec/ });
  await expect(first).toBeVisible();
  const firstName = await first.getByRole('heading', { level: 2 }).innerText();
  await correct();
  // Straight to the partner, no rest timer between the two.
  await expect(page.getByRole('region', { name: firstName })).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByText(/Superset avec/)).toBeVisible();
  await correct();
  // Rest after the second exercise of the pair, then back to the first one.
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('region', { name: firstName })).toBeVisible();
});
