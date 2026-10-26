import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('fine loads: add-on weights, typed load, seat and notch recalled during the set', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('shoulder press');
  await page
    .getByRole('button', { name: 'Ajouter Développé épaules machine à mes machines' })
    .click();
  await page.getByRole('heading', { name: 'Développé épaules machine' }).click();

  // The 2.5 kg add-on, and where the seat and the backrest are set.
  await page.getByRole('switch', { name: '+ 2,5 kg' }).click();
  await expect(page.getByRole('switch', { name: '+ 2,5 kg' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('textbox', { name: 'Siège', exact: true, disabled: false }).fill('4');
  await page.getByRole('textbox', { name: /^Cran/, disabled: false }).fill('2');
  // Saved after a short pause in typing.
  await page.waitForTimeout(600);

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  const entry = page.getByRole('region', { name: 'Développé épaules machine' });
  await expect(entry.getByTestId('machine-setup')).toHaveText('Réglage : siège 4 · cran 2');

  // The + button goes through the add-on: 5 kg plate + 2.5 kg.
  await expect(entry.getByTestId('load')).toHaveText('5 kg');
  await entry.getByRole('button', { name: 'Palier plus lourd' }).click();
  await expect(entry.getByTestId('load')).toHaveText('7,5 kg');
  await expect(entry.getByTestId('breakdown')).toHaveText('Plaque 5 kg + appoint 2,5 kg');

  // A load typed by hand is rounded to 0.5 kg.
  await entry.getByRole('button', { name: /Toucher pour la taper/ }).click();
  const typed = entry.getByRole('textbox', { name: 'Taper la charge' });
  await typed.fill('12,3');
  await typed.press('Enter');
  await expect(entry.getByTestId('load')).toHaveText('12,5 kg');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();
  await expect(entry.getByTestId('load')).toHaveText('12,5 kg');
});
