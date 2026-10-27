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
