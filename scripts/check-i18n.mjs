// Vérifie les fichiers de traduction : mêmes clés dans toutes les langues,
// et aucune clé inutilisée dans le code. Échoue (code 1) sinon.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'src/i18n/locales');
const reference = 'fr-FR.json';

function flatten(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (path === localesDir) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|vue)$/.test(name) ? [path] : [];
  });
}

const locales = Object.fromEntries(
  readdirSync(localesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => [
      name,
      new Set(flatten(JSON.parse(readFileSync(join(localesDir, name), 'utf8')))),
    ]),
);
const referenceKeys = locales[reference];
const errors = [];

for (const [name, keys] of Object.entries(locales)) {
  for (const key of referenceKeys)
    if (!keys.has(key)) errors.push(`${name} : clé manquante « ${key} »`);
  for (const key of keys)
    if (!referenceKeys.has(key)) errors.push(`${name} : clé en trop « ${key} »`);
}

// Une clé est utilisée si elle apparaît entre guillemets dans le code, ou si son
// préfixe sert à construire une clé dynamique (ex. `tabs.${name}`).
const code = sourceFiles(join(root, 'src'))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');
const dynamicPrefixes = [...code.matchAll(/[`'"]([\w.]+\.)\$\{/g)].map((match) => match[1]);
for (const key of referenceKeys) {
  const quoted = ["'", '"', '`'].some((quote) => code.includes(`${quote}${key}${quote}`));
  const dynamic = dynamicPrefixes.some((prefix) => key.startsWith(prefix));
  if (!quoted && !dynamic) errors.push(`clé inutilisée « ${key} »`);
}

if (errors.length > 0) {
  console.error(`Traductions : ${errors.length} problème(s)\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Traductions OK : ${referenceKeys.size} clés, ${Object.keys(locales).length} langues.`);
