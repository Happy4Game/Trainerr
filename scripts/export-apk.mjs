// Copie l'APK construit dans exports/, avec la version de l'appli dans le nom,
// pour l'envoyer facilement sur un téléphone. Usage : npm run android:export
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apk = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
if (!existsSync(apk)) {
  console.error("Pas d'APK : lance d'abord npm run android:apk (voir docs/android.md).");
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
mkdirSync(resolve(root, 'exports'), { recursive: true });
const target = resolve(root, `exports/trainerr-${version}-debug.apk`);
copyFileSync(apk, target);
const size = (statSync(target).size / 1024 / 1024).toFixed(1);
console.log(`APK prêt : ${target} (${size} Mo)`);
