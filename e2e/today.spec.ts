import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('today shows the whole next session, and a lighter one when not in shape', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  for (const name of ['Développé épaules machine', 'Écarté à la machine']) {
    await page.getByRole('searchbox').fill(name);
    await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  }

  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  const hero = page.getByRole('region', { name: 'Séance du jour' });
  await expect(hero.getByText('Développé épaules machine', { exact: true })).toBeVisible();
  await expect(hero.getByText('6 séries')).toBeVisible();

  await hero.getByRole('button', { name: 'Pas en forme ? Alléger la séance' }).click();
  await expect(hero.getByText('4 séries')).toBeVisible();
  await expect(hero.getByRole('button', { name: /Séance allégée/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await hero.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.getByText('Série 1 sur 2')).toBeVisible();

  // Once done, today says so, and another session is an extra.
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await expect(hero.getByText('Séance du jour faite, bravo')).toBeVisible();
  await expect(hero.getByRole('button', { name: 'Faire une séance en plus' })).toBeVisible();
});

test('someone who already trains notes a usual load instead of a test set', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();

  await page.getByRole('tab', { name: 'Séance' }).click();
  // The catalog keeps its own "note my load" button, hidden behind this page.
  const usual = page.getByRole('note').filter({ hasText: 'Tu connais déjà ta charge' });
  await usual.getByRole('button', { name: 'Noter ma charge sur Écarté à la machine' }).click();
  await page.getByRole('textbox', { name: 'Charge (kg)' }).fill('45');
  await page.getByRole('textbox', { name: 'Reps' }).fill('10');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(usual).toHaveCount(0);
  await expect(page.getByText(/séries? · 45\s*kg/).first()).toBeVisible();
});

test('right after the questionnaire, Today offers to note the usual loads too', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  await page.getByRole('searchbox').fill('pec deck');
  await page.getByRole('button', { name: 'Ajouter Écarté à la machine à mes machines' }).click();

  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  const hero = page.getByRole('region', { name: 'Séance du jour' });
  const usual = hero.getByRole('note').filter({ hasText: 'Tu connais déjà ta charge' });
  await usual.getByRole('button', { name: 'Noter ma charge sur Écarté à la machine' }).click();
  await page.getByRole('textbox', { name: 'Charge (kg)' }).fill('45');
  await page.getByRole('textbox', { name: 'Reps' }).fill('10');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(usual).toHaveCount(0);

  // The drawing of a machine of the day opens its card, with a way back to Today.
  await hero.getByRole('link', { name: 'Voir la fiche de Écarté à la machine' }).click();
  await expect(page).toHaveURL(/\/tabs\/today\/exercise\/Butterfly$/);
  await page.getByRole('button', { name: "Aujourd'hui" }).first().click();
  await expect(page).toHaveURL(/\/tabs\/today$/);
});

test('a machine of the session is swapped for a very close one, before and during', async ({
  page,
}) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  for (const name of ['Développé épaules machine', 'Écarté à la machine']) {
    await page.getByRole('searchbox').fill(name);
    await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  }
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  const hero = page.getByRole('region', { name: 'Séance du jour' });

  // Before: the swap is kept for the next sessions, and can be undone.
  await hero.getByRole('button', { name: 'Remplacer Développé épaules machine' }).click();
  const choices = hero.getByRole('group', { name: 'À la place de Développé épaules machine :' });
  const first = choices.getByRole('button').first();
  const other = (await first.textContent())?.trim() ?? '';
  await first.click();
  await expect(hero.getByText('à la place de Développé épaules machine')).toBeVisible();
  await expect(hero.getByText(other, { exact: true })).toBeVisible();
  await hero.getByRole('button', { name: 'Reprendre Développé épaules machine' }).click();
  await expect(hero.getByText('Développé épaules machine', { exact: true })).toBeVisible();

  // During: before the first set, the close machines are one tap away.
  await hero.getByRole('button', { name: 'Commencer' }).click();
  const close = page.getByRole('group', { name: 'Pas cette machine ? Très proches :' });
  await expect(close).toBeVisible();
  const chip = close.locator('ion-chip').first();
  const instead = (await chip.textContent())?.trim() ?? '';
  await chip.click();
  await expect(page.getByRole('region', { name: instead })).toBeVisible();
});

test('the Session page offers the same swap as Today', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByRole('status')).toHaveText(/\d+ exercices/, { timeout: 20_000 });
  for (const name of ['Développé épaules machine', 'Écarté à la machine']) {
    await page.getByRole('searchbox').fill(name);
    await page.getByRole('button', { name: `Ajouter ${name} à mes machines` }).click();
  }
  await page.getByRole('tab', { name: 'Séance' }).click();
  const day = page.getByRole('region', { name: /^Séance du jour : / });

  await day.getByRole('button', { name: 'Remplacer Développé épaules machine' }).click();
  const choices = day.getByRole('group', { name: 'À la place de Développé épaules machine :' });
  const first = choices.getByRole('button').first();
  const other = (await first.textContent())?.trim() ?? '';
  await first.click();
  await expect(day.getByText('à la place de Développé épaules machine')).toBeVisible();
  await expect(day.getByText(other, { exact: true }).first()).toBeVisible();
  await day.getByRole('button', { name: 'Reprendre Développé épaules machine' }).click();
  await expect(day.getByText('Développé épaules machine', { exact: true }).first()).toBeVisible();
});
