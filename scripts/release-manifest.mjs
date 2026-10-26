// Writes latest.json next to the APK of a GitHub Release (see .github/workflows/release.yml).
// Usage : node scripts/release-manifest.mjs <versionName> <versionCode> <fichier APK> <sortie>
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const [versionName, versionCode, apk, output] = process.argv.slice(2);
if (!versionName || !versionCode || !apk || !output) {
  console.error(
    'Usage : node scripts/release-manifest.mjs <versionName> <versionCode> <apk> <sortie>',
  );
  process.exit(1);
}
const tag = `v${versionName}`;
const manifest = {
  version: versionName,
  versionCode: Number(versionCode),
  url: `https://github.com/Happy4Game/Trainerr/releases/download/${tag}/${basename(apk)}`,
};
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(manifest);
