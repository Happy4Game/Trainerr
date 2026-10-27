import { expect, type Page } from '@playwright/test';

/** First launch: skip the questionnaire (defaults: hypertrophy, 4 sessions, 1 h). */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page).toHaveURL(/\/tabs\/catalog$/);
}

/** In the tab bar only: the segments of Progress are tabs too. */
export async function openTab(page: Page, label: string): Promise<void> {
  await page.locator('ion-tab-bar').getByRole('tab', { name: label, exact: true }).click();
}

export async function openCatalog(page: Page): Promise<void> {
  await openTab(page, 'Catalogue');
  await expect(page).toHaveURL(/\/tabs\/catalog$/);
}

/** Weight, measurements and photos: the Body view of Progress. */
export async function openBody(page: Page): Promise<void> {
  await openTab(page, 'Progrès');
  await page.locator('ion-segment-button', { hasText: 'Corps' }).click();
}
