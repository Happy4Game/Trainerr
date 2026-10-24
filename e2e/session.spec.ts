import { expect, test, type Page } from '@playwright/test';

async function star(page: Page, search: string, name: string) {
  await page.getByRole('searchbox').fill(search);
  await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  await expect(page.getByRole('button', { name: `Retirer ${name} de mes machines` })).toBeVisible();
}

async function tab(page: Page, label: string) {
  await page.getByRole('tab', { name: label }).click();
}

test('a whole workout: warm-up, sets, machine taken, resume after reload, summary', async ({
  page,
}) => {
  await page.goto('/tabs/catalog');
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');

  await tab(page, 'Séance');
  await expect(page.getByText('Séance du jour : Haut du corps A')).toBeVisible();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();

  // First exercise: compound first. First time on it: a light test set, no warm-up below it.
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByText(/première fois : série test légère/)).toBeVisible();
  await expect(page.getByText(/Échauffement conseillé/)).toHaveCount(0);
  await expect(page.getByText('Série 1 / 3')).toBeVisible();

  // One tap on the difficulty records the pre-filled set and starts the rest timer.
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page.getByText('Série 2 / 3')).toBeVisible();

  // The machine gets taken: the next exercise is offered, and the machine comes back after it.
  await page.getByRole('button', { name: 'Machine occupée' }).click();
  await expect(page.getByText('Développé épaules machine est occupée')).toBeVisible();
  await page.getByRole('button', { name: /Écarté à la machine/ }).click();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();

  // Survives a reload in the middle of the workout.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible({
    timeout: 20_000,
  });

  for (let set = 1; set <= 3; set++) {
    await expect(page.getByText(`Série ${set} / 3`)).toBeVisible();
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
  }
  await expect(page.getByText('Développé épaules machine est libre ?')).toBeVisible();
  await page.getByRole('button', { name: "Oui, j'y vais" }).click();
  await expect(page.getByText('Série 2 / 3')).toBeVisible();

  // Undo reopens the last exercise logged (the pec fly), then the workout goes on.
  await page.getByRole('button', { name: 'Annuler la dernière série' }).click();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();
  await expect(page.getByText('Série 3 / 3')).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();

  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await expect(page.getByText('Séance terminée')).toBeVisible();
  await expect(page.getByText('4 séries')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();

  // The rotation goes on.
  await expect(page.getByText('Séance du jour : Bas du corps A')).toBeVisible();
});
