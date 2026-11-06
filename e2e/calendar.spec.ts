import { expect, test } from '@playwright/test';
import { openTab, skipOnboarding } from './helpers';

test('Planning opens a calendar of the sessions done, month by month or week by week', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  // One quick session today.
  await openTab(page, 'Séance');
  await page.getByRole('button', { name: 'Faire cette pré-séance' }).click();
  await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  await openTab(page, 'Planning');
  await page.getByRole('button', { name: 'Calendrier de mes séances' }).click();
  const sheet = page.locator('ion-modal').filter({ hasText: 'Mes séances' });
  // This month: today is trained, and picked, with its session under the grid.
  await expect(sheet.getByText('1 séance', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /: 1 séance$/ })).toBeVisible();
  const title = sheet.getByTestId('calendar-title');
  const thisMonth = (await title.textContent()) ?? '';

  // Month by month.
  await sheet.getByRole('button', { name: 'Mois précédent' }).click();
  await expect(title).not.toHaveText(thisMonth);
  await expect(sheet.getByText('Aucune séance')).toBeVisible();
  await sheet.getByRole('button', { name: "Revenir à aujourd'hui" }).click();
  await expect(title).toHaveText(thisMonth);

  // Week by week: each day with its session.
  await sheet.getByRole('radio', { name: 'Semaine' }).click();
  await expect(title).toHaveText(/^Semaine du /);
  await sheet.getByRole('button', { name: 'Semaine précédente' }).click();
  await expect(sheet.getByText('Aucune séance')).toBeVisible();
  await sheet.getByRole('button', { name: 'Semaine suivante' }).click();
  const done = sheet.getByRole('button', { name: /Haut du corps A/ });
  await expect(done).toBeVisible();

  // A session opens its detail in the history.
  await done.click();
  await expect(page).toHaveURL(/\/tabs\/history\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Haut du corps A' })).toBeVisible();
});
