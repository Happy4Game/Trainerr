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
  await page.getByRole('link', { name: '+ Créer une séance' }).click();
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
