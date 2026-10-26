import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

const SERVER = 'https://trainerr.test';

/** Fake Trainerr server: records what the app sends, answers like the real one. */
async function fakeServer(page: Page) {
  const sent: { method: string; path: string; body: unknown }[] = [];
  const groups: { id: string; name: string; code: string }[] = [];
  await page.route(`${SERVER}/v1/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? (JSON.parse(request.postData() ?? '') as unknown) : undefined;
    sent.push({ method: request.method(), path, body });
    const json = (status: number, data?: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
    if (request.method() === 'POST' && path === '/v1/accounts') {
      return json(201, { id: 'a1', token: 'jeton' });
    }
    if (request.method() === 'GET' && path === '/v1/groups') return json(200, { groups });
    if (request.method() === 'POST' && path === '/v1/groups') {
      const group = { id: 'g1', name: (body as { name: string }).name, code: 'K7P2QX' };
      groups.push(group);
      return json(201, group);
    }
    if (request.method() === 'POST' && path === '/v1/groups/join') {
      return json(404, { error: 'unknown_code' });
    }
    if (path.endsWith('/leaderboard')) {
      return json(200, {
        members: [
          { name: 'Léa', me: false, sessions: 4, weeksOnPace: 5 },
          { name: 'Thibaut', me: true, sessions: 0, weeksOnPace: 0 },
        ],
      });
    }
    if (request.method() === 'PUT' && path === '/v1/stats') return route.fulfill({ status: 204 });
    if (request.method() === 'DELETE' && path === '/v1/accounts/me') {
      return route.fulfill({ status: 204 });
    }
    if (request.method() === 'POST' && path === '/v1/advice') {
      return json(200, { advice: 'Belle régularité, garde ce rythme.' });
    }
    return json(404, { error: 'not_found' });
  });
  return sent;
}

async function openFriends(page: Page) {
  await page.goto('/tabs/settings');
  await page.getByRole('link', { name: 'Défis entre amis' }).click();
  await expect(page.getByText(/Seuls ton pseudo/)).toBeVisible();
}

async function signUp(page: Page) {
  await page.getByLabel('Adresse du serveur').fill(SERVER);
  await page.getByRole('button', { name: 'Enregistrer le serveur' }).click();
  await page.getByLabel('Pseudo').fill('Thibaut');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText("Tu n'es dans aucun groupe pour l'instant.")).toBeVisible();
}

test('challenges: account, group with a code, leaderboard, deletion', async ({ page }) => {
  const sent = await fakeServer(page);
  await skipOnboarding(page);
  await openFriends(page);
  await signUp(page);

  // Only regularity goes to the server: no loads by default.
  await expect
    .poll(() => sent.find((r) => r.path === '/v1/stats')?.body)
    .toEqual({ weekStart: expect.any(String), sessions: 0, weeksOnPace: 0 });

  await page.getByLabel('Nom du nouveau groupe').fill('Les potes');
  await page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByText('Code à partager : K7P2QX')).toBeVisible();
  await expect(page.getByText('Léa')).toBeVisible();
  await expect(page.getByText('5 semaines au rythme')).toBeVisible();

  await page.getByLabel("Code d'un groupe").fill('ZZZZZZ');
  await page.getByRole('button', { name: 'Rejoindre' }).click();
  await expect(page.getByRole('alert')).toHaveText('Aucun groupe ne correspond à ce code.');

  await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeVisible();
  expect(sent.some((r) => r.method === 'DELETE' && r.path === '/v1/accounts/me')).toBe(true);
});

test('AI advice: nothing is sent before consent, then the advice is shown', async ({ page }) => {
  const sent = await fakeServer(page);
  await skipOnboarding(page);
  await openFriends(page);
  await signUp(page);

  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await expect(page.getByText('Conseil du coach IA')).toBeVisible();
  await page.getByRole('button', { name: 'Voir ce qui sera envoyé' }).click();
  await expect(page.getByText(/Objectif : 4 séances par semaine/)).toBeVisible();
  expect(sent.some((r) => r.path === '/v1/advice')).toBe(false);

  await page.getByRole('button', { name: "J'accepte d'envoyer ce résumé" }).click();
  await page.getByLabel('Ta question (facultatif)').fill('Je stagne au développé couché');
  await page.getByRole('button', { name: 'Demander un conseil' }).click();
  await expect(page.getByText('Belle régularité, garde ce rythme.')).toBeVisible();
  await expect(page.getByText(/Conseil généré par une IA/)).toBeVisible();
  expect(sent.find((r) => r.path === '/v1/advice')?.body).toMatchObject({
    question: 'Je stagne au développé couché',
    language: 'fr-FR',
  });
});
