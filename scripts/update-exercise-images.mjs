// Télécharge les illustrations des exercices (départ et arrivée du mouvement),
// avec leur licence et leur auteur. Le résultat est versionné : l'appli
// fonctionne hors ligne.
//
// 1. Everkinetic (https://github.com/everkinetic/data, CC BY-SA 4.0), figé à un
//    commit : dessins au trait, convertis en PNG 8 couleurs de 480 px.
// 2. wger.de en secours, pour les machines sans dessin Everkinetic : seulement
//    les images d'Everkinetic et de wger.de (CC BY-SA), jamais d'image IA.
//
// Usage : node scripts/update-exercise-images.mjs (demande rsvg-convert et ImageMagick)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVERKINETIC_COMMIT = '446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6';
const EVERKINETIC_LICENSE = {
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  author: 'Everkinetic',
  authorUrl: 'https://github.com/everkinetic/data',
};
// Le dépôt Everkinetic range à part 99 images d'origine inconnue
// (src/images-png-unknown) : les exercices concernés sont écartés.
const EVERKINETIC_UNKNOWN_ORIGIN = new Set(['0279', '0285', '0293', '0300']);

// Fiche du catalogue → exercice Everkinetic montrant le même geste (vérifié à la main,
// dessin par dessin).
const EVERKINETIC = {
  // Pectoraux
  'Barbell_Bench_Press_-_Medium_Grip': '0042',
  Dumbbell_Bench_Press: '0055',
  Leverage_Chest_Press: '0066',
  Machine_Bench_Press: '0066',
  Butterfly: '0047',
  'Barbell_Incline_Bench_Press_-_Medium_Grip': '0043',
  Incline_Dumbbell_Press: '0080',
  Hammer_Grip_Incline_DB_Bench_Press: '0059',
  Decline_Barbell_Bench_Press: '0051',
  Decline_Dumbbell_Bench_Press: '0052',
  'Wide-Grip_Barbell_Bench_Press': '0082',
  'Wide-Grip_Decline_Barbell_Bench_Press': '0083',
  'Close-Grip_Barbell_Bench_Press': '0049',
  One_Arm_Dumbbell_Bench_Press: '0068',
  One_Arm_Floor_Press: '0070',
  Neck_Press: '0067',
  Smith_Machine_Bench_Press: '0078',
  Smith_Machine_Incline_Bench_Press: '0081',
  'Smith_Machine_Close-Grip_Bench_Press': '0195',
  Leverage_Incline_Chest_Press: '0084',
  Leverage_Decline_Chest_Press: '0085',
  Dumbbell_Flyes: '0056',
  Incline_Dumbbell_Flyes: '0062',
  'Incline_Dumbbell_Flyes_-_With_A_Twist': '0063',
  Decline_Dumbbell_Flyes: '0053',
  Flat_Bench_Cable_Flyes: '0057',
  Cable_Crossover: '0048',
  'Bent-Arm_Barbell_Pullover': '0045',
  'Bent-Arm_Dumbbell_Pullover': '0046',
  'Straight-Arm_Dumbbell_Pullover': '0079',
  'Wide-Grip_Decline_Barbell_Pullover': '0064',
  Front_Raise_And_Pullover: '0058',
  Pushups: '0077',
  'Push-Ups_With_Feet_Elevated': '0075',
  'Push-Ups_-_Close_Triceps_Position': '0188',
  Pushups_Close_and_Wide_Hand_Positions: '0073',
  // Épaules
  Machine_Shoulder_Military_Press: '0003',
  Leverage_Shoulder_Press: '0003',
  Dumbbell_Shoulder_Press: '0012',
  Barbell_Shoulder_Press: '0011',
  Seated_Barbell_Military_Press: '0004',
  'Dumbbell_One-Arm_Shoulder_Press': '0038',
  Arnold_Dumbbell_Press: '0006',
  Side_Lateral_Raise: '0018',
  Front_Dumbbell_Raise: '0010',
  'Front_Two-Dumbbell_Raise': '0033',
  Front_Cable_Raise: '0008',
  Dumbbell_Raise: '0040',
  'Bent_Over_Low-Pulley_Side_Lateral': '0017',
  Dumbbell_Lying_Rear_Lateral_Raise: '0023',
  Lying_Rear_Delt_Raise: '0023',
  'Dumbbell_Lying_One-Arm_Rear_Lateral_Raise': '0037',
  Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench: '0032',
  Barbell_Rear_Delt_Row: '0028',
  Upright_Barbell_Row: '0014',
  Upright_Cable_Row: '0015',
  Standing_Dumbbell_Upright_Row: '0016',
  'Dumbbell_One-Arm_Upright_Row': '0039',
  Smith_Machine_Upright_Row: '0013',
  Cable_Internal_Rotation: '0034',
  Iron_Cross: '0140',
  Barbell_Shrug: '0030',
  Dumbbell_Shrug: '0005',
  Cable_Shrugs: '0009',
  // Dos
  'Wide-Grip_Lat_Pulldown': '0097',
  'V-Bar_Pulldown': '0096',
  Underhand_Cable_Pulldowns: '0093',
  'Straight-Arm_Pulldown': '0092',
  Pullups: '0087',
  'Chin-Up': '0089',
  Seated_Cable_Rows: '0025',
  Bent_Over_Barbell_Row: '0298',
  'Reverse_Grip_Bent-Over_Rows': '0026',
  'T-Bar_Row_with_Handle': '0029',
  Hyperextensions_Back_Extensions: '0103',
  Barbell_Deadlift: '0099',
  Romanian_Deadlift: '0118',
  'One-Arm_Side_Deadlift': '0150',
  Good_Morning: '0101',
  // Triceps
  Triceps_Pushdown: '0205',
  'Triceps_Pushdown_-_Rope_Attachment': '0206',
  'Triceps_Pushdown_-_V-Bar_Attachment': '0207',
  Reverse_Grip_Triceps_Pushdown: '0189',
  Cable_Incline_Pushdown: '0163',
  Cable_Incline_Triceps_Extension: '0164',
  Cable_Lying_Triceps_Extension: '0165',
  Cable_One_Arm_Tricep_Extension: '0166',
  Kneeling_Cable_Triceps_Extension: '0176',
  Low_Cable_Triceps_Extension: '0178',
  'Standing_Low-Pulley_One-Arm_Triceps_Extension': '0199',
  Machine_Triceps_Extension: '0210',
  Dip_Machine: '0171',
  'Dips_-_Triceps_Version': '0172',
  Bench_Dips: '0162',
  Standing_Dumbbell_Triceps_Extension: '0167',
  'Standing_One-Arm_Dumbbell_Triceps_Extension': '0200',
  Standing_Overhead_Barbell_Triceps_Extension: '0201',
  Standing_Towel_Triceps_Extension: '0202',
  'Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': '0196',
  'Standing_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': '0197',
  'Dumbbell_One-Arm_Triceps_Extension': '0173',
  One_Arm_Supinated_Dumbbell_Triceps_Extension: '0187',
  Lying_Dumbbell_Tricep_Extension: '0181',
  Lying_Triceps_Press: '0183',
  'Lying_Close-Grip_Barbell_Triceps_Press_To_Chin': '0180',
  'Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head': '0179',
  Incline_Barbell_Triceps_Extension: '0174',
  Decline_Dumbbell_Triceps_Extension: '0169',
  Decline_EZ_Bar_Triceps_Extension: '0170',
  'Decline_Close-Grip_Bench_To_Skull_Crusher': '0168',
  Reverse_Triceps_Bench_Press: '0190',
  Seated_Triceps_Press: '0194',
  JM_Press: '0175',
  Tate_Press: '0020',
  Tricep_Dumbbell_Kickback: '0204',
  // Biceps
  Barbell_Curl: '0211',
  'EZ-Bar_Curl': '0226',
  'Close-Grip_EZ_Bar_Curl': '0218',
  'Close-Grip_Standing_Barbell_Curl': '0219',
  'Wide-Grip_Standing_Barbell_Curl': '0250',
  Drag_Curl: '0222',
  Spider_Curl: '0245',
  Preacher_Curl: '0239',
  Machine_Preacher_Curls: '0236',
  Machine_Bicep_Curl: '0253',
  Cable_Preacher_Curl: '0217',
  Dumbbell_Bicep_Curl: '0224',
  Dumbbell_Alternate_Bicep_Curl: '0223',
  Hammer_Curls: '0227',
  Alternate_Hammer_Curl: '0213',
  Cross_Body_Hammer_Curl: '0221',
  'Cable_Hammer_Curls_-_Rope_Attachment': '0216',
  Preacher_Hammer_Dumbbell_Curl: '0240',
  Concentration_Curls: '0220',
  'Seated_Close-Grip_Concentration_Barbell_Curl': '0242',
  Incline_Dumbbell_Curl: '0214',
  Alternate_Incline_Dumbbell_Curl: '0214',
  Incline_Inner_Biceps_Curl: '0231',
  Flexor_Incline_Dumbbell_Curls: '0228',
  Dumbbell_Prone_Incline_Curl: '0225',
  Barbell_Curls_Lying_Against_An_Incline: '0215',
  Lying_High_Bench_Barbell_Curl: '0234',
  Lying_Supine_Dumbbell_Curl: '0235',
  Lying_Cable_Curl: '0232',
  'Lying_Close-Grip_Bar_Curl_On_High_Pulley': '0233',
  High_Cable_Curls: '0229',
  Overhead_Cable_Curl: '0238',
  Standing_Biceps_Cable_Curl: '0212',
  'Standing_One-Arm_Cable_Curl': '0247',
  'Standing_Inner-Biceps_Curl': '0246',
  'Standing_One-Arm_Dumbbell_Curl_Over_Incline_Bench': '0248',
  Seated_Dumbbell_Curl: '0243',
  Seated_Dumbbell_Inner_Biceps_Curl: '0244',
  Standing_Dumbbell_Reverse_Curl: '0257',
  'Two-Arm_Dumbbell_Preacher_Curl': '0249',
  One_Arm_Dumbbell_Preacher_Curl: '0237',
  Zottman_Curl: '0251',
  Zottman_Preacher_Curl: '0252',
  // Jambes
  Leg_Press: '0127',
  Narrow_Stance_Leg_Press: '0143',
  Barbell_Squat: '0122',
  Barbell_Full_Squat: '0122',
  Front_Barbell_Squat: '0138',
  Front_Barbell_Squat_To_A_Bench: '0139',
  Wide_Stance_Barbell_Squat: '0160',
  Narrow_Stance_Squats: '0146',
  Barbell_Squat_To_A_Bench: '0133',
  Speed_Squats: '0154',
  Zercher_Squats: '0161',
  Jefferson_Squats: '0141',
  One_Leg_Barbell_Squat: '0147',
  Smith_Machine_Squat: '0124',
  Hack_Squat: '0123',
  Barbell_Hack_Squat: '0125',
  Narrow_Stance_Hack_Squats: '0145',
  Lying_Machine_Squat: '0144',
  Dumbbell_Squat: '0130',
  Dumbbell_Squat_To_A_Bench: '0136',
  Barbell_Lunge: '0114',
  Barbell_Walking_Lunge: '0121',
  Dumbbell_Lunges: '0115',
  Dumbbell_Rear_Lunge: '0129',
  Barbell_Step_Ups: '0134',
  Dumbbell_Step_Ups: '0137',
  Leg_Extensions: '0142',
  Lying_Leg_Curls: '0117',
  Seated_Leg_Curl: '0119',
  Standing_Leg_Curl: '0120',
  Thigh_Abductor: '0156',
  Thigh_Adductor: '0157',
  Cable_Hip_Adduction: '0135',
  'One-Legged_Cable_Kickback': '0112',
  Standing_Calf_Raises: '0282',
  Standing_Barbell_Calf_Raise: '0281',
  Standing_Dumbbell_Calf_Raise: '0283',
  Rocking_Standing_Calf_Raise: '0278',
  Barbell_Seated_Calf_Raise: '0272',
  'Dumbbell_Seated_One-Leg_Calf_Raise': '0276',
  Calf_Press: '0273',
  Calf_Press_On_The_Leg_Press_Machine: '0273',
  Smith_Machine_Reverse_Calf_Raises: '0280',
  // Gainage
  Crunches: '0291',
  'Cross-Body_Crunch': '0289',
  Decline_Crunch: '0292',
  'Crunch_-_Legs_On_Exercise_Ball': '0290',
  Cable_Seated_Crunch: '0288',
  'Bent-Knee_Hip_Raise': '0287',
  Flat_Bench_Lying_Leg_Raise: '0021',
  Flutter_Kicks: '0116',
  Air_Bike: '0284',
  'Barbell_Ab_Rollout_-_On_Knees': '0286',
  Dumbbell_Side_Bend: '0294',
  // Dessins restés inutilisés jusqu'au 28 oct. 2026, rapprochés des fiches sans image.
  Incline_Cable_Flye: '0060',
  'One-Arm_Flat_Bench_Dumbbell_Flye': '0071',
  Seated_Dumbbell_Press: '0012',
  Cable_Seated_Lateral_Raise: '0035',
  'Lying_One-Arm_Lateral_Raise': '0037',
  'One-Arm_Dumbbell_Row': '0024',
  Smith_Machine_Bent_Over_Row: '0022',
  'V-Bar_Pullup': '0090',
  'EZ-Bar_Skullcrusher': '0183',
  'Dumbbell_Tricep_Extension_-Pronated_Grip': '0184',
  One_Arm_Pronated_Dumbbell_Triceps_Extension: '0186',
  'Stiff-Legged_Dumbbell_Deadlift': '0107',
  'Smith_Machine_Stiff-Legged_Deadlift': '0100',
  Plie_Dumbbell_Squat: '0152',
  Weighted_Sissy_Squat: '0158',
  Barbell_Side_Split_Squat: '0131',
  Butt_Lift_Bridge: '0109',
  Side_Bridge: '0113',
  // Machines sans dessin : le même geste, avec des haltères, une barre ou une poulie.
  Seated_Calf_Raise: '0272',
  Ab_Crunch_Machine: '0288',
  Reverse_Machine_Flyes: '0023',
  'trainerr:diverging-seated-row': '0025',
  'trainerr:machine-lateral-raise': '0018',
  // Machines d'assistance : le dessin montre le même geste sans l'aide.
  'trainerr:assisted-pullup': '0087',
  'trainerr:assisted-dip': '0054',
};

// Secours : fiche du catalogue → exercice wger (choisi à la main).
const WGER = {
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
const WGER_LICENSES = {
  1: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  2: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  3: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  4: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};
// Les envois d'autres utilisateurs de wger contiennent parfois des visuels
// commerciaux (filigrane « © HOIST Fitness ») : écartés.
const WGER_TRUSTED_AUTHORS = new Set(['Everkinetic', 'wger.de']);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = resolve(root, 'public/exercise-images');
const work = mkdtempSync(join(tmpdir(), 'trainerr-images-'));

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} : ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const raw = `https://raw.githubusercontent.com/everkinetic/data/${EVERKINETIC_COMMIT}`;
const json = async (url) => JSON.parse((await download(url)).toString('utf8'));
const fileBase = (exerciseId) => exerciseId.replace(/[^\w-]/g, '_');

// Empty the folder without removing it: a running dev server keeps watching it.
mkdirSync(imageDir, { recursive: true });
for (const file of readdirSync(imageDir)) rmSync(resolve(imageDir, file));
const output = {};

/** Reduces a drawing to a light PNG: 480 px wide, 8 shades of grey. */
function toPng(input, file) {
  const png = join(work, `${file}.full.png`);
  if (input.endsWith('.svg'))
    execFileSync('rsvg-convert', ['-w', '480', '-b', 'white', input, '-o', png]);
  else
    execFileSync('magick', [input, '-background', 'white', '-flatten', '-resize', '480x480>', png]);
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

/** Start and end drawings: the vector ones, else the images of the former everkinetic.com. */
async function everkineticImages(number, source) {
  const candidates = [
    ['relaxation', 'tension'].map((phase) => `src/exercises/${number}/${number}-${phase}.svg`),
    (source.img ?? []).map((path) => path.replace(/^_images\/web\//, 'src/images-web/')),
  ];
  for (const paths of candidates) {
    if (paths.length < 2) continue;
    try {
      const files = [];
      for (const [index, path] of paths.slice(0, 2).entries()) {
        const input = join(work, `${number}-${index}${extname(path)}`);
        writeFileSync(input, await download(`${raw}/${path}`));
        const file = `ek-${number}-${index + 1}.png`;
        toPng(input, file);
        files.push(file);
      }
      return files;
    } catch (error) {
      console.warn(`Everkinetic ${number} : ${error.message}`);
    }
  }
  return undefined;
}

// 1. Everkinetic
const everkinetic = new Map((await json(`${raw}/exercises.json`)).map((e) => [e.id_num, e]));
const converted = new Map();
for (const [exerciseId, number] of Object.entries(EVERKINETIC)) {
  const source = everkinetic.get(number);
  if (!source || EVERKINETIC_UNKNOWN_ORIGIN.has(number)) {
    console.warn(`Everkinetic ${number} écarté pour ${exerciseId}`);
    continue;
  }
  if (!converted.has(number)) converted.set(number, await everkineticImages(number, source));
  const files = converted.get(number);
  if (!files) continue;
  output[exerciseId] = {
    sourceName: source.title,
    source: 'Everkinetic',
    sourceUrl: `https://github.com/everkinetic/data/tree/${EVERKINETIC_COMMIT}/src/exercises/${number}`,
    images: files.map((file) => ({ file, ...EVERKINETIC_LICENSE })),
  };
}

// 2. wger, pour les fiches restantes. Injoignable (réseau filtré, par exemple) :
// les dessins Everkinetic suffisent, le script continue sans.
let images = [];
let infos = new Map();
try {
  images = (await json('https://wger.de/api/v2/exerciseimage/?limit=1000&format=json')).results;
  infos = new Map(
    (await json('https://wger.de/api/v2/exerciseinfo/?limit=2000&format=json')).results.map((e) => [
      e.id,
      e,
    ]),
  );
} catch (error) {
  console.warn(`wger.de injoignable, fiches wger ignorées : ${error.message}`);
}
for (const [exerciseId, wgerId] of Object.entries(WGER)) {
  if (images.length === 0) break;
  if (output[exerciseId]) continue;
  const info = infos.get(wgerId);
  const sourceName =
    info?.translations.find((t) => t.language === 2)?.name ?? info?.translations[0]?.name;
  const selected = images
    .filter(
      (i) =>
        i.exercise === wgerId &&
        !i.is_ai_generated &&
        WGER_LICENSES[i.license] &&
        WGER_TRUSTED_AUTHORS.has(i.license_author),
    )
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.id - b.id)
    .slice(0, 2);
  if (selected.length === 0) {
    console.warn(`Aucune image utilisable pour ${exerciseId} (wger ${wgerId})`);
    continue;
  }
  const entries = [];
  for (const [index, image] of selected.entries()) {
    const url = image.thumbnails?.medium ?? image.image;
    const file = `${fileBase(exerciseId)}-${index + 1}${extname(new URL(url).pathname)}`;
    writeFileSync(resolve(imageDir, file), await download(url));
    entries.push({
      file,
      license: WGER_LICENSES[image.license].name,
      licenseUrl: WGER_LICENSES[image.license].url,
      author: image.license_author,
      ...(image.license_author_url ? { authorUrl: image.license_author_url } : {}),
    });
  }
  output[exerciseId] = {
    sourceName,
    source: 'wger.de',
    sourceUrl: `https://wger.de/exercise/${wgerId}/view/`,
    images: entries,
  };
}

rmSync(work, { recursive: true, force: true });
writeFileSync(
  resolve(root, 'src/data/catalog/exercise-images.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`${Object.keys(output).length} fiches illustrées`);
