// Copie le moteur SQLite WebAssembly (sql.js) dans public/assets, où jeep-sqlite
// le cherche quand l'appli tourne dans un navigateur.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'node_modules/sql.js/dist/sql-wasm.wasm');
const targetDir = resolve(root, 'public/assets');

if (!existsSync(source)) {
  console.warn('sql-wasm.wasm introuvable, copie ignorée.');
  process.exit(0);
}
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, resolve(targetDir, 'sql-wasm.wasm'));
