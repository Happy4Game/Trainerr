import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('settings lead to the getting started, about and credits pages', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await page.getByRole('link', { name: 'Réglages' }).click();

  await page.getByText('Bien débuter').click();
  await expect(page.getByText('La technique passe avant la charge')).toBeVisible();
  await expect(page.getByRole('link', { name: /Morton et al., 2018/ })).toBeVisible();
  await page
    .getByRole('banner')
    .filter({ hasText: 'Bien débuter' })
    .getByRole('button', { name: 'Retour' })
    .click();

  await page.getByText('À propos').click();
  await expect(
    page.getByText(/entièrement réalisée avec l'aide d'une intelligence artificielle/),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Voir les crédits et les sources' }).click();

  await expect(page.getByRole('link', { name: 'free-exercise-db' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Everkinetic' })).toBeVisible();
  await expect(page.getByText(/passées en niveaux de gris/)).toBeVisible();
  await expect(page.getByText(/bibliothèques libres embarquées/)).toBeVisible();
});

test('settings offer a prefilled feedback mail and the list of changes', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await page.getByRole('link', { name: 'Réglages' }).click();

  // The mail is only prepared: the link opens the mail app, nothing is sent.
  const feedback = page.locator('ion-item', { hasText: 'Envoyer un retour' }).locator('a');
  const href = await feedback.getAttribute('href');
  expect(href).toMatch(/^mailto:dufeutrel\.thibaut@gmail\.com\?subject=/);
  const body = new URL(href ?? '').searchParams.get('body') ?? '';
  expect(body).toContain('Bonjour Thibaut');
  expect(body).toContain('Trainerr web');
  expect(body).toContain('fr-FR');

  await page.getByText('Nouveautés').click();
  await expect(page.getByText('Séance plus lisible')).toBeVisible();
  await expect(page.getByText('Première version publiée')).toBeVisible();
  await expect(page.getByText('27 octobre 2026').first()).toBeVisible();
});
