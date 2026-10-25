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
    page.getByRole('img', { name: 'Démonstration animée du mouvement : Écarté à la machine' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Mettre la démonstration en pause' }),
  ).toBeVisible();
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
