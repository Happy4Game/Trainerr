// Liste les bibliothèques embarquées dans l'appli (dépendances hors outils de
// développement), avec leur licence et son texte complet, pour la page Crédits.
// Échoue si une licence n'est pas dans la liste acceptée par le cahier des charges.
//
// Usage : node scripts/generate-licenses.mjs (lancé aussi par npm run build)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Zlib (pako, via jeep-sqlite) est aussi permissive que MIT ; jszip (« MIT OR GPL ») est utilisé sous MIT.
const ACCEPTED =
  /^(MIT|ISC|BSD-2-Clause|BSD-3-Clause|Apache-2\.0|0BSD|Unlicense|CC0-1\.0|\(MIT OR GPL-3\.0-or-later\)|MIT OR Apache-2\.0|\(MIT AND Zlib\))$/;

const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const packages = Object.entries(lock.packages)
  .filter(
    // devOptional : outils de build tirés par Vite (lightningcss…), jamais embarqués dans l'appli.
    ([path, info]) =>
      path.startsWith('node_modules/') && !info.dev && !info.optional && !info.devOptional,
  )
  .map(([path, info]) => ({
    path,
    name: path.replace(/^.*node_modules\//, ''),
    version: info.version,
  }));

const seen = new Set();
const libraries = [];
const refused = [];
for (const { path, name, version } of packages) {
  const key = `${name}@${version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const pkg = JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8'));
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'UNKNOWN');
  if (!ACCEPTED.test(license)) refused.push(`${key} (${license})`);
  const file = existsSync(join(root, path))
    ? readdirSync(join(root, path)).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f))
    : undefined;
  libraries.push({
    name,
    version,
    license,
    text: file ? readFileSync(join(root, path, file), 'utf8').trim() : '',
  });
}

if (refused.length > 0) {
  console.error(`Licences non acceptées par le cahier des charges :\n- ${refused.join('\n- ')}`);
  process.exit(1);
}
libraries.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(
  join(root, 'src/data/content/licenses.json'),
  `${JSON.stringify(libraries, null, 1)}\n`,
);
console.log(`${libraries.length} bibliothèques listées.`);
