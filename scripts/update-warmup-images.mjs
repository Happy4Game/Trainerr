// Télécharge les dessins des mouvements de l'échauffement articulaire, avec leur
// licence et leur auteur. Mêmes règles que scripts/update-exercise-images.mjs :
// seulement des dessins sous licence libre (Everkinetic, CC BY-SA 4.0), jamais
// d'image IA, et un mouvement sans dessin fiable reste sans dessin.
//
// Usage : node scripts/update-warmup-images.mjs (demande rsvg-convert et ImageMagick)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVERKINETIC_COMMIT = '446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6';
const EVERKINETIC_LICENSE = {
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  author: 'Everkinetic',
  authorUrl: 'https://github.com/everkinetic/data',
};

// Mouvement de l'échauffement (src/domain/mobility.ts) → exercice Everkinetic
// montrant le même geste (vérifié à la main, dessin par dessin).
// Everkinetic dessine aussi les cercles de genoux (0277), pas retenus : le genou
// plie et tend, il n'est pas fait pour tourner.
const EVERKINETIC = {
  bandPullApart: '0020', // Back Fly's with Exercise Band
  easyPushUps: '0077', // Push Ups
  gluteBridge: '0109', // Bridging
  ankleCircles: '0270', // Ankle Circles
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = resolve(root, 'public/exercise-images');
const work = mkdtempSync(join(tmpdir(), 'trainerr-warmup-'));
const raw = `https://raw.githubusercontent.com/everkinetic/data/${EVERKINETIC_COMMIT}`;

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} : ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Same light PNG as the exercise drawings: 480 px wide, 8 shades of grey. */
function toPng(input, file) {
  const png = join(work, `${file}.full.png`);
  execFileSync('rsvg-convert', ['-w', '480', '-b', 'white', input, '-o', png]);
  execFileSync('magick', [
    png,
    '-colorspace',
    'Gray',
    '-colors',
    '8',
    '-strip',
    `png8:${resolve(imageDir, file)}`,
  ]);
}

const everkinetic = new Map(
  JSON.parse((await download(`${raw}/exercises.json`)).toString('utf8')).map((e) => [e.id_num, e]),
);
const output = {};
for (const [moveId, number] of Object.entries(EVERKINETIC)) {
  const source = everkinetic.get(number);
  if (!source) throw new Error(`Everkinetic ${number} introuvable`);
  const files = [];
  for (const [index, phase] of ['relaxation', 'tension'].entries()) {
    const input = join(work, `${number}-${phase}.svg`);
    writeFileSync(input, await download(`${raw}/src/exercises/${number}/${number}-${phase}.svg`));
    const file = `ek-${number}-${index + 1}.png`;
    toPng(input, file);
    files.push(file);
  }
  output[moveId] = {
    sourceName: source.title,
    source: 'Everkinetic',
    sourceUrl: `https://github.com/everkinetic/data/tree/${EVERKINETIC_COMMIT}/src/exercises/${number}`,
    images: files.map((file) => ({ file, ...EVERKINETIC_LICENSE })),
  };
}
writeFileSync(
  resolve(root, 'src/data/catalog/warmup-images.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`${Object.keys(output).length} mouvement(s) illustré(s)`);
