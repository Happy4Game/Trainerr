/** Lowercase, without accents or surrounding spaces: "  Épaule " → "epaule". */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** True when every word of the query appears in one of the texts (names, aliases, muscles…). */
export function matchesSearch(texts: readonly string[], query: string): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = texts.map(normalizeForSearch).join(' ');
  return words.every((word) => haystack.includes(word));
}

/** Alphabetical order of the language, ignoring case and accents. */
export function compareNames(locale: string): (a: string, b: string) => number {
  return new Intl.Collator(locale, { sensitivity: 'base' }).compare;
}
