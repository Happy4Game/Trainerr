import { expect, test } from '@playwright/test';
import { skipOnboarding, openCatalog } from './helpers';

test('cardio: chosen before the session, logged in it, kept in the history and catalog', async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.getByRole('searchbox').fill('shoulder press');
  await page
    .getByRole('button', { name: 'Ajouter Développé épaules machine à mes machines' })
    .click();

  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.locator('ion-toggle', { hasText: 'Ajouter du cardio à mes séances' }).click();
  const plan = page.getByRole('region', { name: 'Cardio de la séance' });
  await plan.getByRole('radio', { name: 'Rameur' }).click();
  await plan.getByRole('radio', { name: '10 min' }).click();
  await plan.getByRole('radio', { name: 'Avant la muscu' }).click();
  // Upper body, hypertrophy: the order is free, and the studies are named.
  await expect(plan.getByRole('note')).toContainText('Eddens 2018');

  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  const before = page.getByRole('region', { name: "Cardio d'abord" });
  await expect(before).toContainText('Rameur · 10 min prévues');
  await before.getByRole('button', { name: 'Saisir mes perfs' }).click();

  const modal = page.locator('ion-modal');
  // Ionic clones a focused input while scrolling: the real one is the enabled one.
  const field = (label: string) => modal.getByLabel(label).and(page.locator(':enabled'));
  await expect(modal.getByRole('radio', { name: 'Rameur' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // A rower shows no incline: only its own fields are asked.
  await expect(modal.getByLabel('Pente (%)')).toHaveCount(0);
  await field('Distance (km)').fill('2,1');
  await field('Fréquence cardiaque moyenne (bpm)').fill('900');
  // Under load, a tap during an Ionic redraw can be lost: tap again until the
  // check answers (nothing is saved while a value is wrong).
  await expect(async () => {
    await modal.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(modal.getByRole('alert')).toContainText('Fréquence cardiaque', {
      timeout: 1_000,
    });
  }).toPass();
  await field('Fréquence cardiaque moyenne (bpm)').fill('140');
  await modal.getByRole('radio', { name: /Modérée/ }).click();
  await modal.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(before).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Modifier le cardio : Rameur' })).toContainText(
    '10 min · 2,1 km · 2:23 /500 m',
  );

  // Cardio alone is enough to keep the session.
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await expect(page.getByText(/10 min de cardio · 10 \/ 150 min cette semaine/)).toBeVisible();

  await openCatalog(page);
  await page.locator('ion-segment-button', { hasText: 'Cardio' }).click();
  await page.getByRole('link', { name: /Rameur/ }).click();
  await expect(page.getByText('Muscles qui travaillent')).toBeVisible();
  await expect(
    page.getByText("Cette semaine : 10 min sur les 150 min conseillées par l'OMS."),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Modifier le cardio du / })).toContainText(
    '2,1 km',
  );
});
