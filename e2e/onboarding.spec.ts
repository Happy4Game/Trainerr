import { expect, test } from '@playwright/test';

test('the questionnaire sets the program and the week', async ({ page }) => {
  await page.goto('/');
  const next = () => page.getByRole('button', { name: 'Suivant' }).click();

  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Prendre du muscle' }).click();
  await next();

  await page.getByRole('button', { name: '6', exact: true }).click();
  await expect(page.getByText('Programme conseillé : Push / Pull / Legs')).toBeVisible();
  await next();

  await page.getByRole('button', { name: "Je m'entraîne déjà" }).click();
  await next();

  // Evenings every day.
  for (const day of ['sam.', 'dim.']) {
    await page.getByRole('button', { name: `${day} Matin` }).click();
    await page.getByRole('button', { name: `${day} Soir` }).click();
  }
  await next();

  await page.getByRole('button', { name: '1 h', exact: true }).click();
  await next();

  await page.getByRole('button', { name: 'Vélo (dont livraison)' }).click();
  await page.getByRole('button', { name: 'mer. Midi' }).click();
  await next();

  await page.getByRole('button', { name: 'Aucune' }).click();
  await next();

  await expect(page.getByText('Des rappels ?')).toBeVisible();
  await page.getByRole('button', { name: 'Plus tard' }).click();

  await expect(page).toHaveURL(/\/tabs\/today$/);
  await expect(
    page.getByRole('region', { name: 'Prochaine séance' }).getByRole('heading', { name: 'Push A' }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  const week = page.getByRole('list').first();
  await expect(week.getByText(/Push A · 18:00–19:00/)).toBeVisible();
  await expect(week.getByText(/Legs/)).toHaveCount(2);
  // Cycling on Wednesday: no Legs on Wednesday nor Thursday.
  for (const day of ['mercredi', 'jeudi']) {
    await expect(week.getByRole('listitem').filter({ hasText: day })).not.toContainText('Legs');
  }
});

test('the chosen answer is always the only one highlighted', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  const ACTION = 'rgb(67, 56, 202)';
  // Names of the buttons painted in the action colour.
  const highlighted = (group: string) =>
    page.locator(`${group} ion-button`).evaluateAll(
      (buttons, action) =>
        buttons
          .filter((b) => {
            const native = b.shadowRoot?.querySelector('.button-native');
            return native && getComputedStyle(native).backgroundColor === action;
          })
          .map((b) => b.textContent?.trim()),
      ACTION,
    );

  // The answer chosen by default is shown as chosen.
  await expect.poll(() => highlighted('.choices')).toEqual(['Prendre du muscle']);
  await page.getByRole('button', { name: 'Gagner en force' }).tap();
  await expect.poll(() => highlighted('.choices')).toEqual(['Gagner en force']);

  await page.getByRole('button', { name: 'Suivant' }).tap();
  await expect.poll(() => highlighted('.row')).toEqual(['4']);
  await page.getByRole('button', { name: '3', exact: true }).tap();
  await expect.poll(() => highlighted('.row')).toEqual(['3']);

  // Coming back keeps the earlier answer visible.
  await page.getByRole('button', { name: 'Retour' }).tap();
  await expect.poll(() => highlighted('.choices')).toEqual(['Gagner en force']);
});
