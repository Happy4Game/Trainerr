// Télécharge free-exercise-db (domaine public, Unlicense) à un commit figé et garde
// les exercices de musculation utiles à l'appli. Le résultat est versionné dans le
// dépôt : l'appli et les tests n'ont jamais besoin du réseau.
//
// Usage : node scripts/update-free-exercise-db.mjs
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
const CATEGORIES = new Set(['strength', 'powerlifting']);
const EQUIPMENT = new Set(['machine', 'cable', 'dumbbell', 'barbell', 'e-z curl bar', 'body only']);
// Exercices gardés malgré un matériel « other » dans la source.
const ALWAYS_KEEP = new Set(['Hyperextensions_Back_Extensions']);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'src/data/catalog/free-exercise-db.json');

const response = await fetch(URL);
if (!response.ok) throw new Error(`Téléchargement impossible : ${response.status}`);
const all = await response.json();

const exercises = all
  .filter(
    (e) => ALWAYS_KEEP.has(e.id) || (CATEGORIES.has(e.category) && EQUIPMENT.has(e.equipment)),
  )
  // Les images ne sont pas reprises : leur licence est à vérifier une à une (SPEC.md).
  .map(
    ({ id, name, force, mechanic, equipment, primaryMuscles, secondaryMuscles, instructions }) => ({
      id,
      name,
      force,
      mechanic,
      equipment,
      primaryMuscles,
      secondaryMuscles,
      instructions,
    }),
  )
  .sort((a, b) => a.id.localeCompare(b.id));

const output = {
  source: 'https://github.com/yuhonas/free-exercise-db',
  commit: COMMIT,
  license: 'Unlicense (domaine public)',
  exercises,
};
writeFileSync(target, `${JSON.stringify(output, null, 1)}\n`);
console.log(`${exercises.length} exercices écrits dans ${target}`);
