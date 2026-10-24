// Télécharge les illustrations des machines courantes depuis wger.de, avec leur
// licence et leur auteur (CC0, CC-BY ou CC-BY-SA). Les images générées par IA
// sont exclues. Le résultat est versionné : l'appli fonctionne hors ligne.
//
// Usage : node scripts/update-exercise-images.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fiche du catalogue → exercice wger illustrant le même mouvement (choisi à la main).
const MATCHES = {
  Dumbbell_Bench_Press: 75,
  'Barbell_Bench_Press_-_Medium_Grip': 73,
  Leverage_Chest_Press: 129,
  Butterfly: 135,
  Machine_Shoulder_Military_Press: 543,
  Dumbbell_Shoulder_Press: 567,
  Side_Lateral_Raise: 348,
  Triceps_Pushdown: 1185,
  'Triceps_Pushdown_-_Rope_Attachment': 1900,
  'Wide-Grip_Lat_Pulldown': 158,
  Seated_Cable_Rows: 1117,
  Reverse_Machine_Flyes: 822,
  Face_Pull: 1732,
  Dumbbell_Bicep_Curl: 92,
  Hammer_Curls: 272,
  Pullups: 475,
  Leg_Press: 371,
  Barbell_Squat: 1801,
  Hack_Squat: 375,
  Leg_Extensions: 369,
  Lying_Leg_Curls: 365,
  Seated_Leg_Curl: 366,
  Thigh_Abductor: 1748,
  Thigh_Adductor: 12,
  Hyperextensions_Back_Extensions: 301,
  Standing_Calf_Raises: 622,
  Plank: 458,
  'trainerr:diverging-seated-row': 1725,
  'trainerr:machine-lateral-raise': 1744,
};
// Licences acceptées par le cahier des charges (CC-BY-SA seulement pour wger, avec attribution).
const LICENSES = {
  1: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  2: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  3: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  4: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};
const MAX_IMAGES = 2;
// Auteurs dont la licence est sûre : Everkinetic a publié ses illustrations sous
// CC BY-SA, wger.de est le projet lui-même. Les envois d'autres utilisateurs
// contiennent parfois des visuels commerciaux (filigrane « © HOIST Fitness ») :
// ils sont écartés tant qu'ils ne sont pas vérifiés un par un.
const TRUSTED_AUTHORS = new Set(['Everkinetic', 'wger.de']);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = resolve(root, 'public/exercise-images');

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} : ${response.status}`);
  return response.json();
}

const images = (await json('https://wger.de/api/v2/exerciseimage/?limit=1000&format=json')).results;
const infos = new Map(
  (await json('https://wger.de/api/v2/exerciseinfo/?limit=2000&format=json')).results.map((e) => [
    e.id,
    e,
  ]),
);

rmSync(imageDir, { recursive: true, force: true });
mkdirSync(imageDir, { recursive: true });

const output = {};
for (const [exerciseId, wgerId] of Object.entries(MATCHES)) {
  const info = infos.get(wgerId);
  const wgerName =
    info?.translations.find((t) => t.language === 2)?.name ?? info?.translations[0]?.name;
  const selected = images
    .filter(
      (i) =>
        i.exercise === wgerId &&
        !i.is_ai_generated &&
        LICENSES[i.license] &&
        TRUSTED_AUTHORS.has(i.license_author),
    )
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.id - b.id)
    .slice(0, MAX_IMAGES);
  if (selected.length === 0) {
    console.warn(`Aucune image utilisable pour ${exerciseId} (wger ${wgerId})`);
    continue;
  }
  const entries = [];
  for (const [index, image] of selected.entries()) {
    const url = image.thumbnails?.medium ?? image.image;
    const file = `${exerciseId.replace(/[^\w-]/g, '_')}-${index + 1}${extname(new URL(url).pathname)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} : ${response.status}`);
    writeFileSync(resolve(imageDir, file), Buffer.from(await response.arrayBuffer()));
    entries.push({
      file,
      license: LICENSES[image.license].name,
      licenseUrl: LICENSES[image.license].url,
      author: image.license_author,
      ...(image.license_author_url ? { authorUrl: image.license_author_url } : {}),
    });
  }
  output[exerciseId] = {
    wgerName,
    sourceUrl: `https://wger.de/exercise/${wgerId}/view/`,
    images: entries,
  };
}

writeFileSync(
  resolve(root, 'src/data/catalog/exercise-images.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`${Object.keys(output).length} fiches illustrées`);
