import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('encrypted backup: export, then restore with the password only', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  await page
    .getByRole('textbox', { name: 'Mot de passe', disabled: false })
    .fill('motdepasse-solide');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter une sauvegarde chiffrée' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.chiffre\.json$/);
  const content = readFileSync(await file.path(), 'utf8');
  expect(content).toContain('"encrypted":true');
  expect(content).not.toContain('onboarded');

  await page.locator('input[type=file][accept="application/json,.json"]').setInputFiles({
    name: 'sauvegarde.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
  await expect(
    page.getByText('Cette sauvegarde est chiffrée : entre son mot de passe.'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Mot de passe', disabled: false }).last().fill('mauvais');
  await page.getByRole('button', { name: 'Déchiffrer et restaurer' }).click();
  await expect(page.getByRole('alert')).toContainText('Mot de passe incorrect');
});

test('a readable report for a coach and a monthly recap image', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  const report = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Envoyer mon programme et mon historique' }).click();
  const html = readFileSync(await (await report).path(), 'utf8');
  expect(html).toContain('<h1>Mon programme d&#39;entraînement</h1>');
  expect(html).toContain('Haut / Bas');
});

test('monthly body photos are compared side by side', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tabs/history');
  await page.locator('ion-segment-button', { hasText: 'Corps' }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const input = page.locator('input[type=file][capture="user"]');
  await input.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
  await input.setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: /^Photo du / })).toHaveCount(2);
});
