import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('the rest really taken between sets is always recorded, shown on demand', async ({ page }) => {
  await page.clock.install();
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('shoulder press');
  await page
    .getByRole('button', { name: 'Ajouter Développé épaules machine à mes machines' })
    .click();

  await page
    .locator('ion-tab-bar')
    .getByRole('tab', { name: /^Séance/ })
    .click();
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
  // A tap can be lost while the page settles: tap until the switch is on.
  const show = page.getByRole('switch', { name: /Afficher le repos pris/ });
  await expect(async () => {
    if (!(await show.isChecked())) await show.click({ timeout: 2_000 });
    await expect(show).toBeChecked({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  // Within the app, without reloading: the setting may still be on its way to the database.
  // Its name in the tab bar also says a session is under way.
  await page
    .locator('ion-tab-bar')
    .getByRole('tab', { name: /^Séance/ })
    .click();
  // 2 min 15 s of rest, plus the time of the taps.
  await expect(page.locator('section.logged')).toContainText(/repos 2:1\d/, { timeout: 20_000 });

  // The end of the session gives the average: one rest only, so the same.
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await expect(page.getByText(/Repos moyen entre deux séries : 2:1\d\./)).toBeVisible();
});
