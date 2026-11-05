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
  // The month sections only: the before / after photos open too.
  const thumbs = page
    .getByRole('region', { name: /2026/ })
    .getByRole('button', { name: /^Voir la photo du / });
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
  await thumbs.filter({ hasText: '27 sept' }).click();
  await page.getByRole('button', { name: 'Supprimer cette photo' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer définitivement' }).click();
  await expect(thumbs).toHaveCount(1);
  await expect(compare).toHaveCount(0);
});

test('body photos: each one opens on the whole screen, and two are compared in detail', async ({
  page,
}) => {
  await skipOnboarding(page);
  await openBody(page);
  await page.getByRole('link', { name: 'Ouvrir ma galerie' }).click();
  await page.locator('ion-segment-button', { hasText: 'Face' }).click();
  await page.getByLabel('Importer').setInputFiles([photo('a.png'), photo('b.png'), photo('c.png')]);
  // The month sections only: the before / after photos open too.
  const thumbs = page
    .getByRole('region', { name: /2026/ })
    .getByRole('button', { name: /^Voir la photo du / });
  await expect(thumbs).toHaveCount(3);

  // Full screen, with the arrows to the next photo.
  await thumbs.first().click();
  await expect(page.getByText('1 sur 3')).toBeVisible();
  await page.getByRole('button', { name: 'Photo suivante' }).click();
  await expect(page.getByText('2 sur 3')).toBeVisible();
  const date = page.getByLabel('Date de la photo');
  await date.fill('2026-08-01');
  await date.blur();
  await page.getByRole('button', { name: 'Fermer' }).click();

  // The before / after photos open too, and lead to the detailed comparison.
  await page
    .getByRole('region', { name: 'Avant / après' })
    .getByRole('button', { name: /^Voir la photo du 1 août/ })
    .click();
  await page.getByRole('button', { name: 'Comparer avec une autre photo' }).click();
  await expect(page).toHaveURL(/\/tabs\/history\/photos\/compare/);
  await expect(page.getByText(/\d+ semaines? et \d+ séances? d'écart/)).toBeVisible();
  await page.locator('ion-segment-button', { hasText: 'Curseur' }).click();
  await expect(page.getByRole('slider', { name: /Curseur/ })).toBeVisible();
  await page.getByRole('button', { name: 'Première photo' }).click();
  await expect(
    page.getByRole('button', { name: /comme photo d'avant/, pressed: true }),
  ).toHaveCount(1);
});
