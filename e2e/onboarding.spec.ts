import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('the questionnaire sets the program and the week', async ({ page }) => {
  // The week shown depends on the day: a Monday morning, so the whole week is ahead.
  await page.clock.install({ time: new Date('2026-10-26T08:00:00') });
  await page.goto('/');
  const next = () => page.getByRole('button', { name: 'Suivant' }).click();

  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Prendre du muscle' }).click();
  await next();

  await page.getByRole('button', { name: '6', exact: true }).click();
  await expect(page.getByText('Programme conseillé : Push / Pull / Legs')).toBeVisible();
  await next();

  await page.getByRole('button', { name: "Je m'entraîne déjà" }).click();
  await next();

  // Evenings every day.
  for (const day of ['sam.', 'dim.']) {
    await page.getByRole('button', { name: `${day} Matin` }).click();
    await page.getByRole('button', { name: `${day} Soir` }).click();
  }
  await next();

  await page.getByRole('button', { name: '1 h', exact: true }).click();
  await next();

  await page.getByRole('button', { name: 'Vélo (dont livraison)' }).click();
  await page.getByRole('button', { name: 'mer. Midi' }).click();
  await next();

  await page.getByRole('button', { name: 'Aucune' }).click();
  await next();

  await expect(page.getByText('Des rappels ?')).toBeVisible();
  await page.getByRole('button', { name: 'Plus tard' }).click();

  await expect(page).toHaveURL(/\/tabs\/today$/);
  await expect(
    page.getByRole('region', { name: 'Prochaine séance' }).getByRole('heading', { name: 'Push A' }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Planning' }).click();
  await expect(
    page.getByRole('region', { name: 'Prochaine séance' }).getByRole('heading', { level: 2 }),
  ).toBeVisible();
  const week = page.getByRole('list').first();
  const push = week.getByRole('listitem').filter({ hasText: 'Push A' });
  await expect(push).toContainText('18:00–19:00');
  await expect(week.getByText(/Legs/)).toHaveCount(2);
  // Cycling on Wednesday: no Legs on Wednesday nor Thursday.
  for (const day of ['mercredi', 'jeudi']) {
    await expect(week.getByRole('listitem').filter({ hasText: day })).not.toContainText('Legs');
  }
});

test('the chosen answer is always the only one highlighted', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  // Names of the buttons painted in the action colour (the theme's primary colour,
  // read from the page so that a new palette does not break the test).
  const highlighted = (group: string) =>
    page.locator(`${group} ion-button`).evaluateAll((buttons) => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'var(--ion-color-primary)';
      document.body.append(probe);
      const action = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return buttons
        .filter((b) => {
          const native = b.shadowRoot?.querySelector('.button-native');
          return native && getComputedStyle(native).backgroundColor === action;
        })
        .map((b) => b.textContent?.trim());
    });

  // The answer chosen by default is shown as chosen.
  await expect.poll(() => highlighted('.choices')).toEqual(['Prendre du muscle']);
  await page.getByRole('button', { name: 'Gagner en force' }).tap();
  await expect.poll(() => highlighted('.choices')).toEqual(['Gagner en force']);

  await page.getByRole('button', { name: 'Suivant' }).tap();
  // The number of sessions, and the first session of the program.
  await expect.poll(() => highlighted('.row')).toEqual(['4', 'Haut du corps A']);
  await page.getByRole('button', { name: '3', exact: true }).tap();
  await expect.poll(() => highlighted('.row')).toEqual(['3', 'Full body A']);

  // Coming back keeps the earlier answer visible.
  await page.getByRole('button', { name: 'Retour' }).tap();
  await expect.poll(() => highlighted('.choices')).toEqual(['Gagner en force']);
});

test('already mid-cycle: the first session is chosen in the questionnaire', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Ton objectif ?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText('Par quelle séance commences-tu ?')).toBeVisible();
  await page.getByRole('button', { name: 'Bas du corps A' }).click();
  await expect(page.getByRole('button', { name: 'Bas du corps A' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Plus tard' }).click();

  await expect(
    page
      .getByRole('region', { name: 'Prochaine séance' })
      .getByRole('heading', { name: 'Bas du corps A' }),
  ).toBeVisible({ timeout: 20_000 });
});

test('the planning changes the next session and shows what happens if it is missed', async ({
  page,
}) => {
  // A Monday morning: this week's sessions are all to come.
  await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
  await skipOnboarding(page);
  await page.getByRole('tab', { name: 'Planning' }).click();
  const hero = page.getByRole('region', { name: 'Prochaine séance' });
  await expect(hero.getByRole('heading', { name: 'Haut du corps A' })).toBeVisible();

  // Start the cycle elsewhere: the whole order shifts.
  const order = page.getByRole('region', { name: 'Ordre des séances' });
  await order.getByRole('button', { name: 'Haut du corps B' }).click();
  await expect(hero.getByRole('heading', { name: 'Haut du corps B' })).toBeVisible();
  await expect(order.getByRole('button', { pressed: true, name: /Haut du corps B/ })).toBeVisible();

  await hero.getByRole('button', { name: 'Et si je la rate ?' }).click();
  const ifMissed = page.getByRole('region', { name: 'Et si je la rate ?' });
  await expect(ifMissed).toContainText("Si tu rates Haut du corps B, elle n'est pas perdue");
  // The missed session moves to the next slot, instead of the one planned there.
  await expect(ifMissed.getByRole('listitem').first()).toContainText('Haut du corps B');
  await expect(ifMissed.getByRole('listitem').first()).toContainText('au lieu de');
});
