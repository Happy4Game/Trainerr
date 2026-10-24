import type { Difficulty } from './types';

export interface VoiceSet {
  loadKg?: number;
  reps?: number;
  difficulty?: Difficulty;
}

const DIFFICULTY_WORDS: readonly [RegExp, Difficulty][] = [
  [/\b(facile|easy)\b/, 'easy'],
  [/\b(correcte?|ok|okay|bien|good)\b/, 'ok'],
  [/\b(limite|dur|difficile|hard|tough)\b/, 'hard'],
  [/\b(echec|echoue|rate|fail|failed|failure)\b/, 'fail'],
];
const LOAD_UNIT = /^(kg|kgs|kilo|kilos|kilogramme|kilogrammes|kilogram|kilograms)$/;
const REPS_UNIT = /^(rep|reps|repetition|repetitions|fois|times)$/;

/**
 * Reads a set dictated to the phone, e.g. "16 kilos, 10 reps, limite" or
 * "22,5 kg 8 et demi répétitions facile". Returns only what was understood;
 * the user confirms with one tap.
 */
export function parseVoiceSet(transcript: string): VoiceSet {
  const text = transcript
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/(\d)\s*,\s*(\d)/g, '$1.$2')
    .replace(/(\d+)\s+(et demi|and a half)/g, '$1.5')
    .replace(/[,;]/g, ' ');
  const tokens = text.split(/\s+/).filter(Boolean);

  const result: VoiceSet = {};
  const bare: number[] = [];
  tokens.forEach((token, index) => {
    if (!/^\d+(\.\d+)?$/.test(token)) return;
    const value = Number(token);
    const unit = tokens[index + 1] ?? '';
    if (LOAD_UNIT.test(unit) && result.loadKg === undefined) result.loadKg = value;
    else if (REPS_UNIT.test(unit) && result.reps === undefined) result.reps = value;
    else bare.push(value);
  });
  if (result.loadKg === undefined && result.reps === undefined && bare.length >= 2) {
    [result.loadKg, result.reps] = bare as [number, number];
  } else if (result.loadKg === undefined && bare.length > 0 && result.reps !== undefined) {
    result.loadKg = bare[0] as number;
  } else if (result.reps === undefined && bare.length > 0 && result.loadKg !== undefined) {
    result.reps = bare[0] as number;
  }

  const difficulty = DIFFICULTY_WORDS.find(([pattern]) => pattern.test(text))?.[1];
  if (difficulty) result.difficulty = difficulty;
  return result;
}
