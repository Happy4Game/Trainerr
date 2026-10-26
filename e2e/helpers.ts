import { expect, type Page } from '@playwright/test';

/** First launch: skip the questionnaire (defaults: hypertrophy, 4 sessions, 1 h). */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page).toHaveURL(/\/tabs\/catalog$/);
}
