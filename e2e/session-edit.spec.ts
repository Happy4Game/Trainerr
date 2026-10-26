import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function star(page: Page, search: string, name: string) {
  await page.getByRole('searchbox').fill(search);
  await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  await expect(page.getByRole('button', { name: `Retirer ${name} de mes machines` })).toBeVisible();
}

test('during a session: another machine, fewer sets, reorder, and sets moved to the right machine', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');
  await star(page, 'pushdown', 'Extension triceps à la poulie');

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();

  // Same movement on another machine.
  await page.getByRole('button', { name: 'Changer de machine' }).click();
  await page.getByRole('button', { name: 'Prendre Développé épaules haltères' }).click();
  const dumbbells = page.getByRole('region', { name: 'Développé épaules haltères' });
  await expect(dumbbells).toBeVisible();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();

  // One set less.
  await page.getByRole('button', { name: 'Une série de moins sur cet exercice' }).click();
  await expect(page.getByText('Série 1 sur 2')).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();

  // That set was in fact on the machine: moved, the dumbbells come back to do.
  await page.getByRole('button', { name: 'Mauvaise machine ?' }).click();
  // No typing: the same movement comes first in the list.
  const first = page.locator('ion-modal ion-item').first();
  await expect(first).toContainText('Développé épaules machine');
  await expect(first).toContainText('Même mouvement');
  await first.click();
  await expect(page.getByText(/^Développé épaules machine — 2 kg × 10/)).toBeVisible();
  // The right machine now has that set and comes next.
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  // And the session goes on, on that machine.
  await expect(page.getByText('Série 2 sur 2')).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByText('Série 2 sur 2')).toHaveCount(0);

  // Reorder what comes next from the overview.
  await page.getByRole('button', { name: 'Voir le programme de la séance' }).click();
  const later = page.getByRole('button', { name: 'Faire plus tard : Écarté à la machine' });
  await expect(later).toBeVisible();
  await later.click();
  await page.getByRole('button', { name: 'Retirer de la séance : Écarté à la machine' }).click();
  await expect(page.getByText('Écarté à la machine', { exact: true })).toHaveCount(0);
});
