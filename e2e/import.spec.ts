import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

const STRONG = `Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE
2026-10-15 19:02:11;Push A;55m;Bench Press (Dumbbell);1;16;12;0;0;;;
2026-10-17 18:30:00;Legs A;48m;Leg Press;1;90;12;0;0;;;
2026-10-17 18:30:00;Legs A;48m;Burpees;1;0;10;0;0;;;`;

test('imports a Strong export after checking the exercise matches', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.goto('/tabs/settings');
  await page
    .locator('input[type=file][accept=".csv,text/csv"]')
    .setInputFiles({ name: 'strong.csv', mimeType: 'text/csv', buffer: Buffer.from(STRONG) });

  await expect(page.getByText("2 séance(s) trouvée(s) dans l'export Strong.")).toBeVisible();
  await expect(page.getByLabel('Leg Press', { exact: true })).toHaveValue('Leg_Press');
  // Nothing close to burpees in the catalog: skipped.
  await expect(page.getByLabel('Burpees')).toHaveValue('');
  await page.getByRole('button', { name: 'Importer 2 séances' }).click();
  await expect(page.getByText('2 séances importées.')).toBeVisible();

  await page.goto('/tabs/history');
  await expect(page.getByRole('heading', { level: 3, name: 'Séance importée' })).toHaveCount(2, {
    timeout: 20_000,
  });
  await expect(
    page
      .getByRole('list', { name: 'Exercices de Séance importée' })
      .getByRole('listitem')
      .filter({ hasText: 'Presse à cuisses' }),
  ).toContainText('90 kg × 12');

  // Badges of the imported past are already there: no "first session" later on.
  await page.goto('/tabs/today');
  await expect(page.getByText('Première séance')).toBeVisible({ timeout: 20_000 });
});

test('imported sessions: the user picks the session the cycle goes on with', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.goto('/tabs/settings');
  await page
    .locator('input[type=file][accept=".csv,text/csv"]')
    .setInputFiles({ name: 'strong.csv', mimeType: 'text/csv', buffer: Buffer.from(STRONG) });
  await page.getByRole('button', { name: 'Importer 2 séances' }).click();

  const next = page.getByRole('region', { name: 'Par quelle séance continuer ?' });
  await next.getByRole('button', { name: 'Bas du corps B' }).click();
  await expect(next.getByRole('button', { pressed: true, name: /Bas du corps B/ })).toBeVisible();

  await page.goto('/tabs/today/planning');
  await expect(
    page.getByRole('region', { name: 'Prochaine séance' }).getByRole('heading', { level: 2 }),
  ).toHaveText(/Bas du corps B|Plus de séance/);
  await expect(
    page
      .getByRole('region', { name: 'Ordre des séances' })
      .getByRole('button', { pressed: true, name: /Bas du corps B/ }),
  ).toBeVisible();
});

test('the loads already lifted are imported as the starting point on each machine', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.goto('/tabs/settings');
  const LOADS = `exercise,load_kg,reps,date
Presse à cuisses,107,10,2026-10-24
Écarté à la machine,52,12,`;
  await page
    .locator('input[type=file][accept=".csv,text/csv"]')
    .setInputFiles({ name: 'charges.csv', mimeType: 'text/csv', buffer: Buffer.from(LOADS) });
  await expect(page.getByText('2 charges trouvées, une par machine.')).toBeVisible();
  await expect(page.getByLabel(/^Presse à cuisses · 107/)).toHaveValue('Leg_Press');
  await page.getByRole('button', { name: 'Importer 2 charges' }).click();
  await expect(page.getByText(/2 charges importées/)).toBeVisible();

  await page.goto('/tabs/session/catalog');
  await page.getByRole('searchbox').fill('presse à cuisses');
  await expect(
    page.getByRole('button', { name: /Ma charge sur Presse à cuisses : 107\s*kg × 10/ }),
  ).toBeVisible({ timeout: 20_000 });
});

test('imports weighings from a scale export, then shows the curve in Body', async ({ page }) => {
  const day = (ago: number) => new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);
  const SCALE = [
    '"Date","Weight (kg)","Fat mass (kg)"',
    `"${day(20)} 07:10:00","79.2","15.3"`,
    `"${day(13)} 07:05:00","78.8","15.1"`,
    `"${day(6)} 07:12:00","78.3","15.0"`,
  ].join('\n');
  await skipOnboarding(page);
  await page.goto('/tabs/settings');
  await page
    .locator('input[type=file][accept=".csv,text/csv"]')
    .setInputFiles({ name: 'weight.csv', mimeType: 'text/csv', buffer: Buffer.from(SCALE) });
  await expect(page.getByText(/Pesées trouvées : 3/)).toBeVisible();
  await page.getByRole('button', { name: 'Importer 3 pesées' }).click();
  await expect(page.getByText(/3 pesées importées/)).toBeVisible();

  // The same file again adds nothing: those days are already weighed.
  await page
    .locator('input[type=file][accept=".csv,text/csv"]')
    .setInputFiles({ name: 'weight.csv', mimeType: 'text/csv', buffer: Buffer.from(SCALE) });
  await page.getByRole('button', { name: 'Importer 3 pesées' }).click();
  await expect(page.getByText('Aucune nouvelle pesée')).toBeVisible();

  await page.goto('/tabs/body');
  await expect(page.getByText('78,3 kg').first()).toBeVisible();
  await expect(page.getByText('dernière pesée')).toBeVisible();
  await expect(page.getByText(/−0,7 kg \/ semaine|−0,5 kg \/ semaine/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Courbe du poids de corps, 3 pesées' })).toBeVisible();
});
