import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function openCatalog(page: Page) {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
}

// Ionic segment buttons: the click goes to the host element (as a finger tap does).
async function pickFilter(page: Page, label: string) {
  await page.locator('ion-segment-button', { hasText: label }).click();
}

async function search(page: Page, text: string) {
  await page.getByRole('searchbox').fill(text);
}

test('finds a machine by name, alias or muscle, without accents', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'pec deck');
  await expect(page.getByRole('heading', { name: 'Écarté à la machine' })).toBeVisible();
  await search(page, 'epaules machine');
  await expect(page.getByRole('heading', { name: 'Développé épaules machine' })).toBeVisible();
  await search(page, 'poulie haute');
  await expect(page.getByRole('heading', { name: 'Extension triceps à la poulie' })).toBeVisible();
});

test('filters by muscle group', async ({ page }) => {
  await openCatalog(page);
  await pickFilter(page, 'Jambes');
  await search(page, 'presse');
  await expect(page.getByRole('heading', { name: 'Presse à cuisses', exact: true })).toBeVisible();
  await search(page, 'pec deck');
  await expect(page.getByText('Aucun exercice ne correspond.')).toBeVisible();
});

test('a starred machine stays in "Mes machines" after a restart', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();
  await expect(
    page.getByRole('button', { name: 'Retirer Écarté à la machine de mes machines' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await pickFilter(page, 'Mes machines');
  await expect(page.getByRole('status')).toHaveText('1 exercice');
  await expect(page.getByRole('heading', { name: 'Écarté à la machine' })).toBeVisible();
});

test('the machine card shows the muscles and keeps the load steps', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'pec deck');
  await page.getByRole('heading', { name: 'Écarté à la machine' }).click();

  await expect(page).toHaveURL(/\/tabs\/catalog\/Butterfly$/);
  await expect(page.getByRole('img', { name: 'Silhouette : Pectoraux' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Illustration du mouvement : Écarté à la machine' }),
  ).toBeVisible();
  await expect(page.getByText(/Everkinetic \(CC BY-SA 4\.0\)/)).toBeVisible();
  await expect(page.getByText('Rapprocher les poignées en serrant les pectoraux')).toBeVisible();

  const stepInput = page.getByRole('textbox', {
    name: 'Ajouter un palier (kg)',
    disabled: false, // Ionic adds a disabled clone while scrolling
  });
  for (const load of ['52', '59', '45']) {
    await stepInput.fill(load);
    await expect(stepInput).toHaveValue(load);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByRole('button', { name: `Retirer ${load} kg` })).toBeVisible();
    await expect(stepInput).toHaveValue('');
  }
  await expect(page.getByTestId('load-steps')).toHaveText(/45\s*kg.*52\s*kg.*59\s*kg/);
  await expect(page.getByText('Paliers enregistrés')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('load-steps')).toHaveText(/45\s*kg.*52\s*kg.*59\s*kg/, {
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Retirer 52 kg' }).click();
  await expect(page.getByTestId('load-steps')).not.toHaveText(/52/);
});

test('a photo of the machine plate is kept with the machine', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'pec deck');
  await page.getByRole('heading', { name: 'Écarté à la machine' }).click();
  // 1×1 PNG: enough to go through the resize and the storage.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles({ name: 'plaque.png', mimeType: 'image/png', buffer: png });
  await expect(
    page.getByRole('img', { name: 'Plaque de la machine Écarté à la machine' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer la photo' }).click();
  await expect(
    page.getByRole('img', { name: 'Plaque de la machine Écarté à la machine' }),
  ).toHaveCount(0);
});

test('instructions are machine-translated, with the original text on demand', async ({ page }) => {
  await openCatalog(page);
  await page.goto('/tabs/catalog/Arnold_Dumbbell_Press');
  await expect(page.getByText(/Traduction automatique de l'anglais/)).toBeVisible();
  await expect(page.getByText(/Monte les haltères en tournant les paumes/)).toBeVisible();

  await page.getByRole('button', { name: 'Voir le texte original' }).click();
  await expect(page.getByText(/raise the dumbbells as you rotate the palms/)).toBeVisible();
  await page.getByRole('button', { name: 'Voir la traduction' }).click();
  await expect(page.getByText(/Monte les haltères en tournant les paumes/)).toBeVisible();
});

test('the usual load noted on the card is the start of the first session', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();
  await page.getByRole('heading', { name: 'Écarté à la machine' }).click();

  await expect(page.getByText('Ma charge sur cette machine')).toBeVisible();
  await page.getByRole('textbox', { name: 'Charge (kg)', disabled: false }).fill('40');
  await page.getByRole('textbox', { name: 'Reps', disabled: false }).fill('12');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Charge enregistrée.')).toBeVisible();

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await expect(page.getByText('Ta charge habituelle : 40 kg × 12')).toBeVisible();
  await expect(page.getByTestId('load')).toHaveText(/40\s*kg/);
});

test('the load lifted on a machine is noted and shown in the catalog', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();

  await page.getByRole('button', { name: 'Noter ma charge sur Écarté à la machine' }).click();
  await page.getByRole('textbox', { name: 'Charge (kg)' }).fill('45');
  await page.getByRole('textbox', { name: 'Reps' }).fill('10');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  const chip = page.getByRole('button', {
    name: /Ma charge sur Écarté à la machine : 45\s*kg × 10/,
  });
  await expect(chip).toBeVisible();
  // Still there after a restart.
  await page.reload();
  await search(page, 'pec deck');
  await expect(chip).toBeVisible({ timeout: 20_000 });
});

test('the load can be noted on any exercise, even not in my machines', async ({ page }) => {
  await openCatalog(page);
  await search(page, 'curl marteau');
  await page.getByRole('button', { name: 'Noter ma charge sur Curl marteau' }).click();
  await page.getByRole('textbox', { name: 'Charge (kg)' }).fill('14');
  await page.getByRole('textbox', { name: 'Reps' }).fill('12');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    page.getByRole('button', { name: /Ma charge sur Curl marteau : 14\s*kg × 12/ }),
  ).toBeVisible();
});

test('exercises can be found by touching a body part', async ({ page }) => {
  await openCatalog(page);
  await page.getByRole('button', { name: 'Chercher par zone du corps' }).click();
  await page.getByRole('button', { name: 'Biceps', exact: true }).locator('path').first().click();
  await expect(page.getByText('Zone : Biceps')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Curl marteau', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Développé couché barre', exact: true }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Retirer la zone' }).click();
  await expect(page.getByRole('status')).toHaveText('480 exercices');
});
