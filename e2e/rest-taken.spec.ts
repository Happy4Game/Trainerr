import { expect, test } from '@playwright/test';
import { openTab, skipOnboarding } from './helpers';

test('the rest really taken between sets is always recorded, shown on demand', async ({ page }) => {
  await page.clock.install();
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('shoulder press');
  await page
    .getByRole('button', { name: 'Ajouter Développé épaules machine à mes machines' })
    .click();

  await openTab(page, 'Séance');
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.clock.fastForward('02:15');
  // The rest timer may have ended on its own by then.
  const skip = page.getByRole('button', { name: 'Passer', exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  // Hidden by default.
  const logged = page.locator('section.logged');
  await expect(logged).toBeVisible();
  await expect(logged).not.toContainText('repos');

  await page.goto('/tabs/settings');
  await page.getByRole('switch', { name: /Afficher le repos pris/ }).click();
  await page.goto('/tabs/session');
  // 2 min 15 s of rest, plus the time of the taps.
  await expect(page.locator('section.logged')).toContainText(/repos 2:1\d/, { timeout: 20_000 });
});
