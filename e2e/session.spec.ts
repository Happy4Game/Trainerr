import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

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
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'shoulder press', 'Développé épaules machine');
  await star(page, 'pec deck', 'Écarté à la machine');

  await tab(page, 'Séance');
  await expect(page.getByRole('heading', { name: 'Haut du corps A', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();

  // First exercise: compound first. First time on it: a light test set, no warm-up below it.
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByText(/série test légère/)).toBeVisible();
  // Each feeling says what it does to the load: the test set finds the right one.
  await expect(page.getByText('trop léger : la charge monte')).toBeVisible();
  await expect(page.getByText(/Échauffement conseillé/)).toHaveCount(0);
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();

  // One tap on the difficulty records the pre-filled set and starts the rest timer.
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();

  // The machine gets taken: the next exercise is offered, and the machine comes back after it.
  await page.getByRole('button', { name: 'Machine occupée' }).click();
  await expect(page.getByText('Développé épaules machine est occupée')).toBeVisible();
  // Each machine offered comes with a preview: drawing, muscles, load, movement.
  const offer = page.getByRole('listitem').filter({ hasText: 'Écarté à la machine' });
  await expect(offer.getByText(/Pectoraux/)).toBeVisible();
  await expect(offer.getByRole('link', { name: 'Voir le mouvement' })).toBeVisible();
  await offer.getByRole('button', { name: 'Prendre Écarté à la machine' }).click();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();

  // Survives a reload in the middle of the workout.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible({
    timeout: 20_000,
  });

  for (let set = 1; set <= 3; set++) {
    await expect(page.getByText(`Série ${set} sur 3`)).toBeVisible();
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
  }
  await expect(page.getByText('Développé épaules machine est libre ?')).toBeVisible();
  await page.getByRole('button', { name: "Oui, j'y vais" }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();

  // Undo reopens the last exercise logged (the pec fly), then the workout goes on.
  await page.getByRole('button', { name: 'Annuler la dernière série' }).click();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();
  await expect(page.getByText('Série 3 sur 3')).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();

  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await expect(page.getByText('Séance terminée')).toBeVisible();
  await expect(page.getByRole('group', { name: '4 séries' })).toBeVisible();
  await expect(page.getByText('Badge obtenu : Première séance')).toBeVisible();
  const card = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Partager ma séance' }).click();
  expect((await card).suggestedFilename()).toMatch(/^trainerr-\d{4}-\d{2}-\d{2}\.png$/);
  await page.getByRole('button', { name: 'Fermer' }).click();

  // The rotation goes on.
  await expect(page.getByRole('heading', { name: 'Bas du corps A', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await expect(page.getByText('Première séance')).toBeVisible();

  // History and stats show the workout.
  await tab(page, 'Progrès');
  await expect(page.getByRole('heading', { level: 3, name: 'Haut du corps A' })).toBeVisible();
  await page.locator('ion-segment-button', { hasText: 'Stats' }).click();
  await expect(page.getByText('Est-ce que je progresse ?')).toBeVisible();
  await expect(page.getByTestId('trend')).toHaveText(
    'Une seule séance : la tendance arrive à la prochaine.',
  );
  await expect(page.getByText('Suis-je régulier ?')).toBeVisible();
  await expect(page.getByRole('group', { name: "Dernière séance aujourd'hui" })).toBeVisible();
});
