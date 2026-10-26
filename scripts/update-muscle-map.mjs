// Extrait les tracés SVG de la silhouette masculine (face et dos) de MuscleMapJS
// (MIT), eux-mêmes issus du SDK MuscleMap de Melih Çolpan (MIT), à un commit figé.
// Les fichiers sources sont lus comme du texte : aucun code téléchargé n'est exécuté.
//
// Usage : node scripts/update-muscle-map.mjs
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = '04a9862dd3238bd713a7fa73501da04783f70225';
const base = `https://raw.githubusercontent.com/abdofallah/MuscleMapJS/${COMMIT}/src/data`;
// Sous-groupes dessinés par-dessus leur muscle parent : inutiles ici.
const SUB_GROUPS = new Set([
  'upper-chest',
  'lower-chest',
  'inner-quad',
  'outer-quad',
  'hip-flexors',
  'upper-abs',
  'lower-abs',
  'front-deltoid',
  'rear-deltoid',
  'upper-trapezius',
  'lower-trapezius',
]);
// viewBox d'origine (body-path-data.ts).
const VIEW_BOXES = { front: '0 95 727 1280', back: '718 95 727 1280' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function parts(file) {
  const response = await fetch(`${base}/${file}`);
  if (!response.ok) throw new Error(`Téléchargement impossible : ${file} (${response.status})`);
  const text = await response.text();
  const blocks = text.split(/\n {2}\{\n/).slice(1);
  return blocks
    .map((block) => {
      const slug = /slug: '([a-z-]+)'/.exec(block)?.[1];
      const paths = [...block.matchAll(/'(M[^']+)'/g)].map((match) => match[1]);
      return { slug, paths };
    })
    .filter((part) => part.slug && !SUB_GROUPS.has(part.slug) && part.paths.length > 0);
}

const output = {
  source: 'https://github.com/abdofallah/MuscleMapJS',
  commit: COMMIT,
  license: 'MIT — voir LICENSE-MuscleMap.md',
  front: { viewBox: VIEW_BOXES.front, parts: await parts('male-front-paths.ts') },
  back: { viewBox: VIEW_BOXES.back, parts: await parts('male-back-paths.ts') },
};
const target = resolve(root, 'src/ui/muscleMap/bodyPaths.json');
writeFileSync(target, `${JSON.stringify(output)}\n`);
console.log(
  `Face : ${output.front.parts.map((p) => p.slug).join(', ')}\nDos : ${output.back.parts.map((p) => p.slug).join(', ')}`,
);
