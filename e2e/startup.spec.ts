import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('the first launch opens the questionnaire, skipping it leads to the catalog', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
});

test('the five tabs are reachable', async ({ page }) => {
  await skipOnboarding(page);
  for (const [label, path] of [
    ['Séance', 'session'],
    ['Catalogue', 'catalog'],
    ['Progrès', 'history'],
    ['Corps', 'body'],
    ["Aujourd'hui", 'today'],
  ] as const) {
    await page.getByRole('tab', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`/tabs/${path}$`));
  }
  // The week plan opens from Today, with the old address still working.
  await page.getByRole('link', { name: 'Planning', exact: true }).click();
  await expect(page).toHaveURL(/\/tabs\/today\/planning$/);
  await page.goto('/tabs/planning');
  await expect(page).toHaveURL(/\/tabs\/today\/planning$/);
});

test('the questionnaire is not shown again after a reload', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/today');
  await expect(page.getByRole('region', { name: 'Séance du jour' })).toBeVisible({
    timeout: 20_000,
  });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Séance du jour' })).toBeVisible({
    timeout: 20_000,
  });
});

test('the tab bar stays above the Android navigation bar', async ({ page }) => {
  await skipOnboarding(page);
  // Capacitor injects the height of the system bars as CSS variables.
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px'),
  );
  const tabBar = page.locator('ion-tab-bar');
  await expect
    .poll(() => tabBar.evaluate((bar) => parseFloat(getComputedStyle(bar).paddingBottom)))
    .toBeGreaterThanOrEqual(48);
});
