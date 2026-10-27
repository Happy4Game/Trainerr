import { expect, test } from '@playwright/test';
import { openBody, skipOnboarding } from './helpers';

// A tiny real PNG: the app shrinks and re-encodes each photo, so it must load.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);
const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

test('body photos: imported, dated, sorted by pose and compared, on the phone only', async ({
  page,
}) => {
  await skipOnboarding(page);
  await openBody(page);
  await page.getByRole('link', { name: 'Ouvrir ma galerie' }).click();
  await expect(page.getByRole('note')).toContainText("rien n'est envoyé sur internet");

  // Imported as front photos: the pose chosen above applies to new photos.
  await page.locator('ion-segment-button', { hasText: 'Face' }).click();
  await page.getByLabel('Importer').setInputFiles([photo('a.png'), photo('b.png')]);
  const thumbs = page.getByRole('button', { name: /^Voir la photo du / });
  await expect(thumbs).toHaveCount(2);

  // The first one was in fact taken a month ago.
  await thumbs.first().click();
  const date = page.getByLabel('Date de la photo');
  await date.fill('2026-09-27');
  await date.blur();
  await page.getByRole('button', { name: 'Fermer' }).click();

  const compare = page.getByRole('region', { name: 'Avant / après' });
  await expect(compare).toContainText(/\d+ semaines? et \d+ séances? d'écart/);
  await expect(page.getByRole('region', { name: /septembre 2026/i })).toBeVisible();

  // Removing asks twice.
  await page.getByRole('button', { name: /^Voir la photo du 27 sept/ }).click();
  await page.getByRole('button', { name: 'Supprimer cette photo' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer définitivement' }).click();
  await expect(thumbs).toHaveCount(1);
  await expect(compare).toHaveCount(0);
});
