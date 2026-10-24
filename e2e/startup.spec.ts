import { expect, test } from '@playwright/test';
import { latestSchemaVersion } from '../src/data/sqlite/migrations';

const ready = new RegExp(`Base prête \\(schéma version ${latestSchemaVersion}\\)`);

test('the app opens on Today and the database is ready', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/tabs\/today$/);
  await expect(page.getByRole('status')).toHaveText(ready, {
    timeout: 15_000,
  });
});

test('the five tabs are reachable', async ({ page }) => {
  await page.goto('/');
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

test('the database survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText(/Base prête/, { timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole('status')).toHaveText(ready, {
    timeout: 15_000,
  });
});
