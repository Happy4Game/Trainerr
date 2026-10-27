import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('ready-made Pull session: order explained, assisted pull-ups used when they are my machine', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('gravitron');
  await page.getByRole('button', { name: 'Ajouter Tractions assistées à mes machines' }).click();

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('link', { name: 'Voir les séances types' }).click();
  await expect(page.getByRole('heading', { name: 'Push (poussée)' })).toBeVisible();

  // The principle, with its sources.
  await page.getByText('Pourquoi cet ordre ?').click();
  await expect(page.getByRole('link', { name: /Simão et al., 2012/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Nunes et al., 2021/ })).toHaveAttribute(
    'href',
    'https://doi.org/10.1080/17461391.2020.1733672',
  );

  const pull = page.getByRole('region', { name: 'Pull', exact: true });
  await expect(pull.getByRole('link', { name: /^Tractions assistées/ })).toBeVisible();
  await expect(pull.getByText("À la place de Tractions : c'est une de tes machines")).toBeVisible();
  await expect(pull.getByText('4 × 6-8 · repos 2 min 30')).toBeVisible();
  await expect(pull.getByText(/Polyarticulaire lourd · Le plus exigeant du tirage/)).toBeVisible();
  await pull.getByRole('button', { name: 'Commencer : Pull' }).click();

  await expect(page.getByRole('region', { name: 'Tractions assistées' })).toBeVisible();
  await expect(page.getByText('Série 1 sur 4')).toBeVisible();
});

test('a custom session with an isolation before its compound is flagged and fixed', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('link', { name: 'Créer une séance' }).click();
  await page.getByRole('textbox', { name: 'Nom de la séance' }).fill('Bras');
  for (const [search, name] of [
    ['pushdown', /Extension triceps à la poulie/],
    ['bench press medium', /Développé couché barre/],
  ] as const) {
    await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
    await page.getByRole('search').last().getByRole('searchbox').fill(search);
    await page.getByRole('button', { name }).first().click();
  }
  await expect(page.getByRole('note')).toContainText(
    'Extension triceps à la poulie est avant Développé couché barre',
  );
  await page.getByRole('button', { name: "Remettre dans l'ordre conseillé" }).click();
  await expect(page.getByRole('note')).toHaveCount(0);
  await expect(page.locator('ol.list li .name').first()).toHaveText('Développé couché barre');
});

test('the machines of a ready-made session join my machines in one tap', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.goto('/tabs/session/presets');
  const push = page.getByRole('region', { name: 'Push', exact: true });
  await push.getByRole('button', { name: 'Commencer : Push' }).click();
  await expect(page.getByRole('region', { name: 'Développé couché barre' })).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();

  await expect(page.getByText('Tu as utilisé Développé couché barre')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter cette machine à mes machines' }).click();
  await expect(page.getByText('Tu as utilisé Développé couché barre')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Catalogue' }).click();
  await page.getByRole('searchbox').fill('bench press medium');
  await expect(
    page.getByRole('button', { name: 'Retirer Développé couché barre de mes machines' }),
  ).toBeVisible();
});

test('a beginner is offered the beginner full body first, with realistic loads', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  const next = () => page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Prendre du muscle' }).click();
  await next();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await next();
  await page.getByRole('button', { name: 'Je débute' }).click();
  await next();
  await next(); // availability as it is
  await page.getByRole('button', { name: '1 h', exact: true }).click();
  await next();
  await page.getByRole('button', { name: 'Non', exact: true }).click();
  await next();
  await page.getByRole('button', { name: 'Aucune' }).click();
  await next();
  await page.getByRole('button', { name: 'Plus tard' }).click();

  await page.getByRole('tab', { name: 'Séance' }).click();
  await expect(page.getByText('Tu débutes ? Commence ici')).toBeVisible();
  await page.getByRole('button', { name: 'Commencer : Full body débutant' }).click();
  const legPress = page.getByRole('region', { name: 'Presse à cuisses' });
  await expect(legPress).toBeVisible();
  // A light test set, not the lightest plate of the machine.
  await expect(legPress.getByTestId('load')).toHaveText('45 kg');
});

test('a ready-made session is copied, changed and started with its own sets and reps', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.getByRole('link', { name: 'Voir les séances types' }).click();
  const pull = page.getByRole('region', { name: 'Pull', exact: true });
  await pull.getByRole('button', { name: 'Copier et modifier : Pull' }).click();

  // The copy opens for changes, with the sets, reps and rests of the ready-made session.
  await expect(page.getByRole('textbox', { name: 'Nom de la séance' })).toHaveValue(
    'Pull (ma version)',
  );
  const first = page.locator('ol.list li').first();
  await expect(first).toContainText('4 × 6-8 · repos 2 min 30');
  await page.getByRole('button', { name: /^Une série de moins pour Tractions/ }).click();
  await page.getByRole('button', { name: /^Plus de reps pour Tractions/ }).click();
  await expect(first).toContainText('3 × 7-9 · repos 2 min 30');
  await page.getByRole('button', { name: 'Enregistrer la séance' }).click();

  await page.getByRole('button', { name: 'Commencer Pull (ma version)' }).click();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
});
