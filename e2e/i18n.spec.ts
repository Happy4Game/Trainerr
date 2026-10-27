import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

/** Visible texts of buttons, tabs, titles and headings: data (exercise names, numbers) excluded. */
async function interfaceTexts(page: Page): Promise<string[]> {
  return page
    .locator(
      'ion-title:visible, ion-tab-button:visible ion-label, ion-button:visible, ion-card-title:visible, ion-segment-button:visible ion-label',
    )
    .allInnerTexts();
}

test('pseudo-language: every interface text comes from the translation files', async ({ page }) => {
  await skipOnboarding(page);
  for (const path of [
    '/tabs/today',
    '/tabs/session',
    '/tabs/catalog',
    '/tabs/history',
    '/tabs/today/planning',
    '/tabs/settings',
  ]) {
    await page.goto(`${path}?pseudo`);
    await expect(page.locator('ion-title:visible').first()).toContainText('⟦', { timeout: 20_000 });
    await page.waitForTimeout(300);
    for (const text of await interfaceTexts(page)) {
      const words = text.replace(/[\d\s.,:+−×%/·—-]+/g, '');
      if (words.length === 0) continue;
      expect(text, `${path}: « ${text} » is not translated`).toMatch(/⟦/);
    }
  }
});

test('the language can be switched to English without restarting', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  await page
    .locator('ion-select')
    .filter({ hasText: /Langue/ })
    .click();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.locator('ion-title:visible')).toHaveText('Settings');
  await page.getByRole('tab', { name: 'Catalog' }).click();
  await expect(page.getByRole('status').filter({ hasText: /exercises/ })).toHaveText(
    /\d+ exercises/,
  );
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Catalog' })).toBeVisible({ timeout: 20_000 });
});

test('loads can be shown in pounds', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  await page
    .locator('ion-select')
    .filter({ hasText: /Unité de poids/ })
    .click();
  await page.getByRole('radio', { name: 'Livres (lb)' }).click();
  await page.getByRole('tab', { name: 'Catalogue' }).click();
  await page.getByRole('searchbox').fill('pec deck');
  await page.getByRole('heading', { name: 'Écarté à la machine' }).click();
  await expect(page.getByText(/Paliers par défaut.*\d+ lb/)).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole('textbox', { name: 'Ajouter un palier (lb)', disabled: false }),
  ).toBeVisible();
});
