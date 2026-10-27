import { expect, type Page } from '@playwright/test';

/** First launch: skip the questionnaire (defaults: hypertrophy, 4 sessions, 1 h). */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page).toHaveURL(/\/tabs\/session\/catalog$/);
}

/** The catalog lives in the Session tab, behind the book icon of its header. */
export async function openCatalog(page: Page): Promise<void> {
  // In the tab bar only: the Progress tab has a "Séances" segment, a tab too.
  await page
    .locator('ion-tab-bar')
    .getByRole('tab', { name: /^Séance(\s|$)/ })
    .click();
  // Ionic reopens the tab where it was left: maybe the catalog already.
  if (!/\/tabs\/session\/catalog$/.test(page.url()))
    await page.getByRole('link', { name: 'Catalogue', exact: true }).click();
  await expect(page).toHaveURL(/\/tabs\/session\/catalog$/);
}
