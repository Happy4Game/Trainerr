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
  // The test set asks one thing: was it too light?
  await expect(page.getByText('Trop léger ? Tu aurais pu faire 3 reps de plus ?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Oui, trop léger' })).toBeVisible();
  await expect(page.getByText(/Échauffement conseillé/)).toHaveCount(0);
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();

  // One tap on the difficulty records the pre-filled set and starts the rest timer.
  await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  // The orange timer shows the full length of the rest, and follows the +30 s.
  const total = page.getByTestId('rest-total');
  await expect(total).toHaveText(/^sur \d+:\d\d$/);
  const seconds = (text: string) => {
    const [m, s] = text.replace('sur ', '').split(':').map(Number);
    return (m ?? 0) * 60 + (s ?? 0);
  };
  const before = seconds(await total.innerText());
  await page.getByRole('button', { name: /allonger le repos/ }).click();
  await expect.poll(async () => seconds(await total.innerText())).toBe(before + 30);
  // The rest goes on after the app is closed and opened again.
  await page.reload();
  await expect(page.getByRole('timer')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();

  // The machine gets taken: one sheet, "taken, I'll come back" already chosen.
  const sheet = page.locator('ion-card.replace');
  // Leaving the sheet changes nothing, and it does not stay on screen.
  await page.getByRole('button', { name: 'Machine occupée' }).click();
  await expect(sheet.getByRole('radio', { name: /Occupée/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await sheet
    .getByRole('button', { name: 'Annuler, je reste sur Développé épaules machine' })
    .click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Développé épaules machine' })).toBeVisible();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();

  await page.getByRole('button', { name: 'Machine occupée' }).click();
  await expect(sheet.getByText(/Développé épaules machine revient juste après/)).toBeVisible();
  // Each machine offered comes with a preview: drawing, muscles, load.
  const offer = sheet.getByRole('listitem').filter({ hasText: 'Écarté à la machine' });
  await expect(offer.getByText(/Pectoraux/)).toBeVisible();
  // The drawing opens the machine card, as everywhere else.
  await expect(
    offer.getByRole('link', { name: 'Voir la fiche de Écarté à la machine' }),
  ).toBeVisible();
  // The other choice is one tap away, in the same sheet.
  await sheet.getByRole('radio', { name: /Remplacer/ }).click();
  await expect(sheet.getByText(/pour toute la séance/)).toBeVisible();
  await sheet.getByRole('radio', { name: /Occupée/ }).click();
  await offer.getByRole('button', { name: 'Faire Écarté à la machine en attendant' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();

  // Survives a reload in the middle of the workout.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible({
    timeout: 20_000,
  });

  // Adding an exercise: those for the muscles of this session come first.
  await page.getByRole('button', { name: '+ Ajouter un exercice' }).click();
  const picker = page.locator('ion-modal').filter({ hasText: 'Pour cette séance' });
  await expect(picker.getByText('Autres exercices')).toBeVisible();
  await picker.getByRole('button', { name: 'Annuler' }).click();
  await expect(picker).toHaveCount(0);

  for (let set = 1; set <= 3; set++) {
    await expect(page.getByText(`Série ${set} sur 3`)).toBeVisible();
    await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();
  }
  await expect(page.getByText('Développé épaules machine est libre ?')).toBeVisible();
  // Back to the busy machine: its drawing, which opens its card.
  await expect(
    page.getByRole('link', { name: 'Voir la fiche de Développé épaules machine' }),
  ).toBeVisible();
  await page.getByRole('button', { name: "Oui, j'y vais" }).click();
  await expect(page.getByText('Série 2 sur 3')).toBeVisible();

  // Undo reopens the last exercise logged (the pec fly), then the workout goes on.
  await page.getByRole('button', { name: 'Annuler la dernière série' }).click();
  await expect(page.getByRole('region', { name: 'Écarté à la machine' })).toBeVisible();
  await expect(page.getByText('Série 3 sur 3')).toBeVisible();
  await page.getByRole('button', { name: /^(Série faite|Non, ça va)$/ }).click();
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

test('one tap logs a set, like with a coach; the rest shows once; reps are set per machine', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await star(page, 'pec deck', 'Écarté à la machine');

  // Reps for this machine only, on its card.
  await page
    .getByRole('link', { name: /Écarté à la machine/ })
    .first()
    .click();
  const group = page.getByRole('group', { name: 'Mes reps sur cette machine' });
  await expect(group.getByTestId('range-max')).toHaveText('15');
  await group.getByRole('button', { name: 'Une rep de plus au maximum' }).click();
  await expect(group.getByTestId('range-max')).toHaveText('16');
  await expect(page.getByText('Ta fourchette pour cette machine.', { exact: false })).toBeVisible();

  await tab(page, 'Séance');
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  const entry = page.getByRole('region', { name: 'Écarté à la machine' });
  await expect(entry).toBeVisible();
  // The rest depends on the exercise only: shown once, before the tap.
  await expect(entry.getByTestId('rest-preview')).toHaveCount(1);
  await expect(entry.getByTestId('rest-preview')).toHaveText(/Repos après la série : \d+:\d\d/);
  // After the test set, a single button: the reps decide the load, no feeling to pick.
  await entry.getByRole('button', { name: 'Non, ça va' }).click();
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(entry.getByRole('button', { name: 'Série faite' })).toBeVisible();
  // A load far too light still goes up at once, with the small button next to it.
  await expect(entry.getByRole('button', { name: 'Trop léger' })).toBeVisible();
  await expect(entry.getByRole('button', { name: 'Oui, trop léger' })).toHaveCount(0);
});
