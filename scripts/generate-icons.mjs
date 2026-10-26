// Icône de l'appli : l'haltère de Lucide (ISC, https://lucide.dev/license),
// en blanc sur l'indigo du thème. Génère les icônes Android (classique,
// ronde, adaptative et monochrome), les écrans de démarrage et le favicon.
// Usage : node scripts/generate-icons.mjs (demande rsvg-convert, paquet librsvg)
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(root, 'android/app/src/main/res');
const INDIGO = '#4338ca';

// Lucide « dumbbell », grille de 24.
const DUMBBELL = [
  'M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z',
  'm2.5 21.5 1.4-1.4',
  'm20.1 3.9 1.4-1.4',
  'M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z',
  'm9.6 14.4 4.8-4.8',
];

/** The glyph, `size` wide, centred on (cx, cy). */
const glyph = (cx, cy, size) =>
  `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 24})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DUMBBELL.map((d) => `<path d="${d}"/>`).join('')}</g>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const ICON = svg(
  512,
  512,
  `<rect width="512" height="512" rx="112" fill="${INDIGO}"/>${glyph(256, 256, 300)}`,
);
const ROUND = svg(
  512,
  512,
  `<circle cx="256" cy="256" r="256" fill="${INDIGO}"/>${glyph(256, 256, 280)}`,
);
// Adaptive icon: 108 units, only the centre 66 are always visible.
const FOREGROUND = svg(108, 108, glyph(54, 54, 56));
const splash = (w, h) =>
  svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${INDIGO}"/>${glyph(w / 2, h / 2, Math.min(w, h) * 0.28)}`,
  );

function render(source, file, w, h = w) {
  execFileSync('rsvg-convert', ['-w', String(w), '-h', String(h), '-o', file], { input: source });
}

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = join(res, `mipmap-${density}`);
  render(ICON, join(dir, 'ic_launcher.png'), 48 * scale);
  render(ROUND, join(dir, 'ic_launcher_round.png'), 48 * scale);
  render(FOREGROUND, join(dir, 'ic_launcher_foreground.png'), 108 * scale);
}

// Splash screens keep the size Capacitor gave them.
for (const dir of readdirSync(res).filter((d) => d.startsWith('drawable'))) {
  const file = join(res, dir, 'splash.png');
  let size;
  try {
    size = execFileSync('magick', ['identify', '-format', '%w %h', file], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
  } catch {
    continue;
  }
  const [w, h] = size.split(' ').map(Number);
  render(splash(w, h), file, w, h);
}

writeFileSync(
  join(res, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${INDIGO}</color>\n</resources>\n`,
);
// Monochrome layer: the themed icon of Android 13 and later.
for (const name of ['ic_launcher', 'ic_launcher_round']) {
  writeFileSync(
    join(res, `mipmap-anydpi-v26/${name}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
  );
}

writeFileSync(
  join(root, 'public/favicon.svg'),
  `${svg(32, 32, `<rect width="32" height="32" rx="7" fill="${INDIGO}"/>${glyph(16, 16, 20)}`)}\n`,
);
console.log('Icônes générées.');
