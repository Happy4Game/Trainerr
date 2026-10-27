import { normalizeForSearch } from './catalogSearch';
import type { IsoDate } from './types';

export type CsvFormat = 'strong' | 'hevy' | 'trainerr';

export interface ImportedSet {
  readonly exerciseName: string;
  readonly loadKg: number;
  readonly reps: number;
  readonly warmup: boolean;
}

export interface ImportedSession {
  readonly date: IsoDate;
  readonly title: string;
  readonly sets: readonly ImportedSet[];
}

const LB_TO_KG = 0.45359237;
/** How each app marks a warm-up set in its export. */
const WARMUP_MARK: Readonly<Record<CsvFormat, string>> = {
  strong: 'w',
  hevy: 'warmup',
  trainerr: '1',
};

/** RFC 4180 CSV: commas or semicolons, quoted fields, doubled quotes. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i] as string;
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * A session export, the loads already lifted on each machine (no session), or
 * body weighings (a date and a weight, from a scale app or typed by hand).
 */
export function detectFormat(
  header: readonly string[],
): CsvFormat | 'loads' | 'weights' | undefined {
  const h = header.map((c) => c.trim().toLowerCase());
  if (h.includes('exercise_title') && h.includes('weight_kg')) return 'hevy';
  if (h.includes('exercise name') && h.includes('set order')) return 'strong';
  if (h.includes('load_kg') && h.includes('template')) return 'trainerr';
  if (h.includes('load_kg') && h.includes('exercise')) return 'loads';
  if (dateColumn(h) !== -1 && weightColumn(h) !== -1) return 'weights';
  return undefined;
}

const dateColumn = (header: readonly string[]) =>
  header.findIndex((c) => /^"?(date|jour|day|time|timestamp)\b/.test(c));
/** "weight_kg", "Weight (kg)", "Poids", "Body weight (lb)"… but not "Fat mass weight". */
const weightColumn = (header: readonly string[]) =>
  header.findIndex((c) => /^"?(body[ _-]?)?(weight|poids)(_|\b)/.test(c));

export interface ImportedWeighing {
  readonly date: IsoDate;
  readonly weightKg: number;
}

/**
 * Body weighings, one per line: `date,weight_kg`. The weight column may be
 * named weight, poids or body weight, in lb when its name says so. Dates in
 * ISO (2026-10-24, time ignored) or French order (24/10/2026). Implausible
 * values are skipped; the last weighing of a day wins.
 */
export function parseWeightsCsv(text: string): ImportedWeighing[] {
  const [header, ...rows] = parseCsv(text);
  const h = (header ?? []).map((c) => c.trim().toLowerCase());
  if (detectFormat(h) !== 'weights')
    throw new Error('Format de fichier non reconnu (date, weight_kg).');
  const date = dateColumn(h);
  const weight = weightColumn(h);
  const factor = /\b(lb|lbs|pounds?)\b/.test(h[weight] ?? '') ? LB_TO_KG : 1;
  const byDay = new Map<IsoDate, number>();
  for (const row of rows) {
    const day = toIsoDate(row[date] ?? '') ?? frenchDate(row[date] ?? '');
    const kg = Math.round(number(row[weight]) * factor * 10) / 10;
    if (!day || kg < 20 || kg > 400) continue;
    byDay.set(day, kg);
  }
  return [...byDay.entries()]
    .map(([day, weightKg]) => ({ date: day, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 24/10/2026 or 24.10.2026: day first, as written in France. */
function frenchDate(text: string): IsoDate | undefined {
  const match = /(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(text);
  if (!match) return undefined;
  const [, day, month, year] = match as unknown as [string, string, string, string];
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31)
    return undefined;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export interface ImportedLoad {
  readonly exerciseName: string;
  readonly loadKg: number;
  readonly reps: number;
  /** When it was lifted; today when missing. */
  readonly date?: IsoDate;
}

/**
 * Loads already lifted, one line per machine: `exercise,load_kg,reps,date`.
 * Lines without a name or reps are skipped; the last line of an exercise wins.
 */
export function parseLoadsCsv(text: string): ImportedLoad[] {
  const [header, ...rows] = parseCsv(text);
  if (!header || detectFormat(header) !== 'loads')
    throw new Error('Format de fichier non reconnu (exercise, load_kg, reps).');
  const column = (name: string) => header.findIndex((c) => c.trim().toLowerCase() === name);
  const [name, load, reps, date] = ['exercise', 'load_kg', 'reps', 'date'].map(column);
  const loads = new Map<string, ImportedLoad>();
  for (const row of rows) {
    const exerciseName = (row[name as number] ?? '').trim();
    const repCount = number(row[reps as number]);
    if (!exerciseName || repCount <= 0) continue;
    const day = date === -1 ? undefined : toIsoDate(row[date as number] ?? '');
    loads.delete(exerciseName);
    loads.set(exerciseName, {
      exerciseName,
      loadKg: number(row[load as number]),
      reps: repCount,
      ...(day ? { date: day } : {}),
    });
  }
  return [...loads.values()];
}

const number = (text: string | undefined) => {
  const value = Number((text ?? '').replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
};

/**
 * Reads a CSV export from another app. Strong: one row per set, the weight in
 * the unit of the export (`lbs` → converted). Hevy: weight already in kg.
 */
export function parseWorkoutCsv(
  text: string,
  options: { strongUnit?: 'kg' | 'lb' } = {},
): { format: CsvFormat; sessions: ImportedSession[] } {
  const [header, ...rows] = parseCsv(text);
  const format = header ? detectFormat(header) : undefined;
  if (format === 'loads') throw new Error('Ce fichier contient des charges, pas des séances.');
  if (format === 'weights') throw new Error('Ce fichier contient des pesées, pas des séances.');
  if (!header || !format)
    throw new Error('Format de fichier non reconnu (Strong, Hevy ou Trainerr).');
  const column = (name: string) => header.findIndex((c) => c.trim().toLowerCase() === name);

  const get = {
    strong: {
      date: column('date'),
      title: column('workout name'),
      name: column('exercise name'),
      weight: column('weight'),
      reps: column('reps'),
      warmup: column('set order'),
    },
    hevy: {
      date: column('start_time'),
      title: column('title'),
      name: column('exercise_title'),
      weight: column('weight_kg'),
      reps: column('reps'),
      warmup: column('set_type'),
    },
    trainerr: {
      date: column('date'),
      title: column('template'),
      name: column('exercise'),
      weight: column('load_kg'),
      reps: column('reps'),
      warmup: column('warmup'),
    },
  }[format];
  const factor = format === 'strong' && options.strongUnit === 'lb' ? LB_TO_KG : 1;

  const sessions = new Map<string, { date: IsoDate; title: string; sets: ImportedSet[] }>();
  for (const row of rows) {
    const date = toIsoDate(row[get.date] ?? '');
    const name = (row[get.name] ?? '').trim();
    const reps = number(row[get.reps]);
    if (!date || !name || reps <= 0) continue;
    const title = (row[get.title] ?? '').trim();
    const key = `${date}|${title}`;
    const session = sessions.get(key) ?? { date, title, sets: [] };
    const warmupCell = (row[get.warmup] ?? '').trim().toLowerCase();
    session.sets.push({
      exerciseName: name,
      loadKg: Math.round(number(row[get.weight]) * factor * 1000) / 1000,
      reps,
      warmup: WARMUP_MARK[format] === warmupCell,
    });
    sessions.set(key, session);
  }
  return {
    format,
    sessions: [...sessions.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

const MONTHS: Readonly<Record<string, string>> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** "2026-10-24 19:02:11", "2026-10-24T19:02", "24 Oct 2026, 19:02" → "2026-10-24". */
export function toIsoDate(text: string): IsoDate | undefined {
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const written = /(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/.exec(text);
  const month = written ? MONTHS[(written[2] as string).toLowerCase()] : undefined;
  if (written && month) return `${written[3]}-${month}-${(written[1] as string).padStart(2, '0')}`;
  return undefined;
}

/**
 * Catalog exercises closest to a name from another app, best first: exact
 * name or alias, then most words in common. The user confirms each match.
 */
export function suggestMatches(
  name: string,
  catalog: readonly { id: string; names: readonly string[] }[],
  limit = 5,
): string[] {
  const wanted = normalizeForSearch(name)
    .replace(/\(.*?\)/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const scored = catalog.map((entry) => {
    const normalized = entry.names.map(normalizeForSearch);
    if (normalized.includes(normalizeForSearch(name))) return { id: entry.id, score: 1000 };
    const words = new Set(normalized.flatMap((n) => n.split(/[^a-z0-9]+/)));
    const common = wanted.filter((w) => words.has(w)).length;
    // Extra words in the main name make a more specific, less likely exercise.
    const mainWords = (normalized[0] ?? '').split(/[^a-z0-9]+/).filter(Boolean).length;
    return {
      id: entry.id,
      score: common / Math.max(wanted.length, 1) - (mainWords - common) * 0.01,
    };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.id);
}
