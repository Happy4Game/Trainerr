import { expect, test } from '@playwright/test';
import { openBody, skipOnboarding } from './helpers';

// Chromium's fake camera (playwright.config.ts) stands in for the phone's.
test('body photo taken inside the app: pose above, camera switch, count kept up to date', async ({
  page,
}) => {
  await skipOnboarding(page);
  await openBody(page);
  await expect(page.getByRole('link', { name: 'Ouvrir ma galerie' })).toBeVisible();

  await page.getByRole('button', { name: 'Prendre une photo' }).click();
  const modal = page.locator('ion-modal.camera');
  await expect(modal.getByLabel('Aperçu de la caméra')).toBeVisible();
  await modal.locator('ion-segment-button', { hasText: 'Dos' }).click();
  await expect(modal.getByText('mets le retardateur à 10 s')).toBeVisible();

  // Self-timer: off, 3 s, 10 s, off.
  const timer = modal.getByRole('button', { name: /^Retardateur/ });
  await timer.click();
  await expect(timer).toHaveAccessibleName(/3 s/);
  await timer.click();
  await timer.click();
  await expect(timer).toHaveAccessibleName(/0 s/);

  await modal.getByRole('button', { name: 'Prendre la photo' }).click();
  await expect(modal.getByRole('img', { name: 'Photo prise' })).toBeVisible();
  await modal.getByRole('button', { name: 'Reprendre' }).click();
  await modal.getByRole('button', { name: 'Prendre la photo' }).click();
  await modal.getByRole('button', { name: 'Garder cette photo' }).click();

  // The count follows, and so does a removal done in the gallery.
  const gallery = page.getByRole('link', { name: 'Ma galerie (1 photo)' });
  await expect(gallery).toBeVisible();
  await gallery.click();
  await page.locator('ion-segment-button', { hasText: 'Dos' }).click();
  await page.getByRole('button', { name: /^Voir la photo du / }).click();
  await page.getByRole('button', { name: 'Supprimer cette photo' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer définitivement' }).click();
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page.getByRole('link', { name: 'Ouvrir ma galerie' })).toBeVisible();
});
