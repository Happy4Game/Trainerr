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

export interface CatalogRanked {
  readonly name: string;
  /** In the user's machines (starred). */
  readonly favorite: boolean;
  /** One of the common gym machines (curated card). */
  readonly popular: boolean;
  /** Has a drawing of the movement. */
  readonly illustrated: boolean;
}

export type CatalogSection = 'favorites' | 'popular' | 'others';

export function catalogSection(entry: CatalogRanked): CatalogSection {
  if (entry.favorite) return 'favorites';
  return entry.popular ? 'popular' : 'others';
}

const SECTION_ORDER: Record<CatalogSection, number> = { favorites: 0, popular: 1, others: 2 };

/**
 * Catalog order: my machines, then the popular machines, then the rest;
 * in each part, illustrated exercises first, then by name.
 */
export function compareCatalog(
  compareName: (a: string, b: string) => number,
): (a: CatalogRanked, b: CatalogRanked) => number {
  return (a, b) =>
    SECTION_ORDER[catalogSection(a)] - SECTION_ORDER[catalogSection(b)] ||
    Number(b.illustrated) - Number(a.illustrated) ||
    compareName(a.name, b.name);
}
