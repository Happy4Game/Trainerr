/**
 * Captures d'écran des écrans clés, à 360 × 800, en sombre et en clair, avec
 * 10 semaines de séances fictives mais réalistes (importées comme une sauvegarde).
 *
 *   npx vite build && npx vite preview --port 4173 --strictPort &
 *   CHROMIUM_PATH=/usr/bin/brave node scripts/capture-design.mjs docs/design/apres
 *
 * Sert aux comparaisons avant / après de docs/design.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';

const outDir = resolve(process.argv[2] ?? 'docs/design/apres');
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';
const TODAY = '2026-10-27';
mkdirSync(outDir, { recursive: true });

// ---- Fictitious history: 10 weeks, upper / lower, 3 to 4 sessions a week ----

const addDays = (date, days) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const UPPER = [
  // [exercise, start load, step per week, reps, sets]
  ['Barbell_Bench_Press_-_Medium_Grip', 60, 1.25, 8, 3],
  ['Wide-Grip_Lat_Pulldown', 50, 1.25, 10, 3],
  ['Machine_Shoulder_Military_Press', 30, 0.5, 10, 3],
  ['Seated_Cable_Rows', 45, 1, 10, 3],
  ['Side_Lateral_Raise', 8, 0.2, 12, 3],
  ['Triceps_Pushdown', 25, 0.5, 12, 2],
];
const LOWER = [
  ['Barbell_Squat', 80, 1.25, 6, 3],
  ['Leg_Press', 120, 2.5, 10, 3],
  ['Lying_Leg_Curls', 35, 0.5, 12, 2],
  ['Standing_Calf_Raises', 50, 1, 12, 2],
];

function buildHistory() {
  const sessions = [];
  const sets = [];
  const start = addDays(TODAY, -7 * 10 + 1); // a Tuesday, 10 weeks ago
  let n = 0;
  for (let week = 0; week < 10; week++) {
    // 3 sessions most weeks, 4 on some, one week off (holidays).
    if (week === 4) continue;
    const days = week % 3 === 0 ? [0, 2, 3, 5] : [0, 2, 4];
    days.forEach((offset, i) => {
      const date = addDays(start, week * 7 + offset);
      if (date >= TODAY) return;
      const upper = i % 2 === 0;
      const template = upper ? (i === 0 ? 'upperA' : 'upperB') : i === 1 ? 'lowerA' : 'lowerB';
      const id = `demo-${++n}`;
      sessions.push({
        id,
        date,
        template,
        status: 'done',
        gym_id: 'default',
        note: null,
        plan: '{}',
      });
      let position = 0;
      for (const [exercise, load0, step, reps, count] of upper ? UPPER : LOWER) {
        // The squat stalls for the last 3 weeks: the stats must say so.
        const weeks = exercise === 'Barbell_Squat' ? Math.min(week, 6) : week;
        const load = Math.round((load0 + step * weeks) * 4) / 4;
        for (let s = 0; s < count; s++) {
          sets.push({
            id: `${id}-${++position}`,
            session_id: id,
            exercise_id: exercise,
            position,
            load_kg: load,
            reps: s === count - 1 ? reps - 1 : reps,
            difficulty: s === count - 1 ? 'hard' : 'ok',
            warmup: 0,
            slow_tempo: 0,
            complete_reps: 1,
            discomfort_zone: null,
            rir: s === count - 1 ? 1 : null,
            note: null,
          });
        }
      }
    });
  }
  const body = Array.from({ length: 10 }, (_, w) => ({
    id: `body-${w}`,
    date: addDays(start, w * 7 + 1),
    weight_kg: Math.round((78.4 - w * 0.2 + (w % 2) * 0.15) * 10) / 10,
    measurements: '{}',
    photo_path: null,
  }));
  return { sessions, sets, body };
}

// ---- Browser ----

async function newPage(browser, colorScheme) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
    colorScheme,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(`${TODAY}T18:30:00`) });
  return { context, page };
}

async function seed(page, scheme) {
  await page.goto(`${baseURL}/`);
  await page.getByText('Ton objectif ?').waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.waitForURL(/\/tabs\/catalog$/);
  await page.goto(`${baseURL}/tabs/settings`);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter une sauvegarde (JSON)' }).click();
  const file = await download;
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  const backup = JSON.parse(readFileSync(path, 'utf8'));
  const { sessions, sets, body } = buildHistory();
  backup.tables.session = sessions;
  backup.tables.set_log = sets;
  backup.tables.body_measurement = body;
  backup.tables.gym_machine = [...UPPER, ...LOWER].map(([exercise], i) => ({
    id: `demo-machine-${i}`,
    gym_id: 'default',
    exercise_id: exercise,
    load_steps_kg: '[]',
    favorite: 1,
    plate_photo: null,
    settings: null,
    machine_setup: '{}',
  }));
  const settings = JSON.parse(backup.meta.settings);
  backup.meta.settings = JSON.stringify({
    ...settings,
    programStart: sessions[0].date,
    theme: scheme,
  });
  const seeded = join(tmpdir(), `trainerr-demo-${Date.now()}.json`);
  writeFileSync(seeded, JSON.stringify(backup));
  await page.locator('input[type=file][accept*=json]').setInputFiles(seeded);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  console.log('✓', name);
}

/** Scrolls the visible ion-content by a screen. */
async function scrollContent(page, y) {
  await page.evaluate(async (top) => {
    const contents = [...document.querySelectorAll('ion-content')].filter(
      (c) => c.offsetParent !== null,
    );
    await contents.at(-1)?.scrollToPoint(0, top, 0);
  }, y);
}

async function capture(browser, scheme) {
  const { context, page } = await newPage(browser, scheme);
  await seed(page, scheme);
  const p = (name) => `${scheme}-${name}`;

  await page.goto(`${baseURL}/tabs/today`);
  await page.getByRole('tab', { name: "Aujourd'hui" }).waitFor();
  await page.waitForTimeout(1500);
  await shot(page, p('01-accueil'));

  // Le menu de l'onglet Séance, avant de commencer : tous les choix possibles.
  await page.getByRole('tab', { name: 'Séance' }).click();
  await page.waitForTimeout(1200);
  await shot(page, p('01b-menu-seance-1'));
  await scrollContent(page, 700);
  await shot(page, p('01b-menu-seance-2'));
  await scrollContent(page, 1400);
  await shot(page, p('01b-menu-seance-3'));
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await page.waitForTimeout(800);

  // « Commencer » lance directement la séance du jour.
  await page.locator('ion-button:visible', { hasText: 'Commencer' }).first().click();
  await page.locator('section.entry').first().waitFor({ timeout: 20_000 });
  const skip = page.getByRole('button', { name: "Passer l'échauffement" });
  if (await skip.isVisible()) await skip.click();
  await shot(page, p('02-seance'));
  await scrollContent(page, 520);
  await shot(page, p('03-seance-saisie'));

  await page.getByRole('button', { name: 'Correct', exact: true }).first().click();
  await scrollContent(page, 0);
  await shot(page, p('04-repos'));

  // Dernière série de l'exercice : l'écran « Machine suivante ».
  await page.getByRole('button', { name: 'Passer', exact: true }).first().click();
  await page.getByRole('button', { name: 'Correct', exact: true }).first().click();
  await page.getByRole('region', { name: 'Machine suivante' }).waitFor();
  await shot(page, p('04a-machine-suivante'));

  // Fin de séance : le récap.
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByText('Séance terminée').waitFor();
  await shot(page, p('04b-recap'));
  await page.getByRole('button', { name: 'Fermer' }).first().click();

  await page.goto(`${baseURL}/tabs/history`);
  await page.waitForTimeout(800);
  await shot(page, p('05-historique'));

  await page.locator('ion-segment-button', { hasText: 'Stats' }).click();
  await page.waitForTimeout(800);
  await shot(page, p('06-stats-1'));
  for (const [i, y] of [700, 1400, 2100, 2800].entries()) {
    await scrollContent(page, y);
    await shot(page, p(`06-stats-${i + 2}`));
  }

  await page.goto(`${baseURL}/tabs/settings`);
  await page.waitForTimeout(800);
  await shot(page, p('07-reglages'));

  await page.goto(`${baseURL}/tabs/planning`);
  await page.waitForTimeout(800);
  await shot(page, p('08-planning'));

  await page.goto(`${baseURL}/tabs/catalog`);
  await page.waitForTimeout(1200);
  await shot(page, p('09-catalogue'));

  await context.close();
}

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
for (const scheme of ['dark', 'light']) await capture(browser, scheme);
await browser.close();
