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
    ['Historique', 'history'],
    ['Planning', 'planning'],
    ["Aujourd'hui", 'today'],
  ] as const) {
    await page.getByRole('tab', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`/tabs/${path}$`));
  }
});

test('the questionnaire is not shown again after a reload', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/today');
  await expect(page.getByRole('region', { name: 'Prochaine séance' })).toBeVisible({
    timeout: 20_000,
  });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Prochaine séance' })).toBeVisible({
    timeout: 20_000,
  });
});
