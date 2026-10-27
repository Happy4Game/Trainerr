import { expect, test } from '@playwright/test';
import { openCatalog, skipOnboarding } from './helpers';

test('my own rep range applies to every machine', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  await page.getByRole('switch', { name: /Ma propre fourchette de reps/ }).click();
  await expect(page.getByRole('spinbutton', { name: 'Reps minimum' })).toHaveValue('8');
  await expect(page.getByRole('spinbutton', { name: 'Reps maximum' })).toHaveValue('12');
  await expect(page.getByRole('link', { name: /continuum des répétitions/ })).toBeVisible();

  // An isolation machine (12–15 by default) now shows 8–12.
  await openCatalog(page);
  await page.getByRole('searchbox').fill('pec deck');
  await page.getByRole('heading', { name: 'Écarté à la machine' }).click();
  await expect(page.getByText('8 à 12 reps')).toBeVisible();
});
