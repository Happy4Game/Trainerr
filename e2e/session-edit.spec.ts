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
  await expect(page.getByText(/^Développé épaules machine — \d+ kg × 10/)).toBeVisible();
  // The right machine now has that set and comes next.
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  // And the session goes on, on that machine.
  await expect(page.getByText('Série 2 sur 2')).toBeVisible();
  // The screen scrolls back up after the move: on a loaded runner the tap can
  // land during that scroll and be lost. Tap again only if the set is still due.
  await expect(async () => {
    if ((await page.getByText('Série 2 sur 2').count()) > 0)
      await page.getByRole('button', { name: 'Correct', exact: true }).click({ timeout: 1000 });
    await expect(page.getByText('Série 2 sur 2')).toHaveCount(0, { timeout: 3000 });
  }).toPass({ timeout: 15_000 });

  // Reorder what comes next from the overview.
  await page.getByRole('button', { name: 'Voir le programme de la séance' }).click();
  const later = page.getByRole('button', { name: 'Faire plus tard : Écarté à la machine' });
  await expect(later).toBeVisible();
  await later.click();
  // Wait for the new order before the next tap: on a slow machine the list is
  // redrawn after the move, and a tap on the old row would be lost.
  await expect(page.locator('ion-modal li').last()).toContainText('Écarté à la machine');
  // The sheet redraws its list after the move, and on a slow runner a tap can
  // land on the button that slid under the finger. Remove from a list opened
  // afresh, which no longer moves.
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.locator('ion-modal li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voir le programme de la séance' }).click();
  await expect(page.locator('ion-modal li').last()).toContainText('Écarté à la machine');
  await page.getByRole('button', { name: 'Retirer de la séance : Écarté à la machine' }).click();
  await expect(page.getByText('Écarté à la machine', { exact: true })).toHaveCount(0);
});

test('switching machine is at hand: next to the name after a set, and on the next machine screen', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');

  await page.getByRole('tab', { name: 'Séance' }).click();
  // Same insights as on Today: here, every machine is new.
  await expect(page.getByText('1re fois').filter({ visible: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  const machine = page.getByRole('region', { name: 'Développé épaules machine' });
  await expect(machine).toBeVisible();
  // "Correct" is low on the screen: once tapped, the set is confirmed and the
  // view goes back up to the rest timer.
  const scrollTop = () =>
    page
      .locator('ion-content.ion-padding:visible')
      .first()
      .evaluate(async (el) => (await (el as HTMLIonContentElement).getScrollElement()).scrollTop);
  const correct = page.getByRole('button', { name: 'Correct', exact: true });
  await correct.scrollIntoViewIfNeeded();
  expect(await scrollTop()).toBeGreaterThan(0);
  await correct.click();
  await expect(page.getByText(/Série enregistrée : Développé épaules machine/)).toBeVisible();
  await expect.poll(scrollTop).toBe(0);
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();

  // After a set, the button sits next to the name, and its sheet opens over the screen.
  const switchButton = machine.getByRole('button', { name: 'Changer de machine' });
  await expect(switchButton).toBeInViewport();
  await switchButton.click();
  const card = page.locator('ion-card.replace');
  await expect(card).toBeInViewport();
  await expect(card).toContainText('1 série déjà faite');
  await card.getByRole('button', { name: 'Prendre Développé épaules haltères' }).click();

  // The dumbbells come next: that screen offers the switch too.
  const next = page.getByRole('region', { name: 'Machine suivante' });
  await expect(next).toContainText('Développé épaules haltères');
  await next.getByRole('button', { name: 'Changer de machine' }).click();
  await expect(page.locator('ion-card.replace')).toBeInViewport();
  await expect(page.locator('ion-card.replace')).toContainText(
    'Remplacer Développé épaules haltères',
  );
});
