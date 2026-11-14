import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('"not in shape" keeps all the sets, is said during the session, and can be undone', async ({
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
  await hero.getByRole('button', { name: 'Pas en forme ? Pas de hausse de charge' }).click();
  await hero.getByRole('button', { name: 'Commencer' }).click();

  // All the planned sets, no machine left early; the screen says what changes.
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
  await expect(page.getByTestId('tired-note')).toBeVisible();

  await page.getByRole('button', { name: 'Je me sens mieux : la charge peut monter' }).click();
  await expect(page.getByText('Série 1 sur 3')).toBeVisible();
  await expect(page.getByTestId('tired-note')).toBeHidden();
});
