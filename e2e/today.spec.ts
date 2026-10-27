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
  const hero = page.getByRole('region', { name: 'Prochaine séance' });
  await expect(hero.getByText('Développé épaules machine')).toBeVisible();
  await expect(hero.getByText('6 séries')).toBeVisible();

  await hero.getByRole('button', { name: 'Pas en forme ? Alléger la séance' }).click();
  await expect(hero.getByText('4 séries')).toBeVisible();
  await expect(hero.getByRole('button', { name: /Séance allégée/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await hero.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.getByText('Série 1 sur 2')).toBeVisible();
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
