/**
 * Test pseudo-language (SPEC.md, i18n): every text is accented, about 40 %
 * longer and wrapped in ⟦ ⟧. A text without the brackets on screen is a
 * string written in the code instead of the translation files; a cut ⟦ shows
 * a label too narrow for longer languages. Placeholders and plural bars stay.
 */
const ACCENTS: Record<string, string> = {
  a: 'à',
  c: 'ç',
  e: 'é',
  i: 'î',
  n: 'ñ',
  o: 'ô',
  s: 'š',
  u: 'ü',
  y: 'ý',
  A: 'Â',
  C: 'Ç',
  E: 'É',
  I: 'Î',
  O: 'Ö',
  S: 'Š',
  U: 'Û',
};

function pseudoText(text: string): string {
  return text
    .split('|')
    .map((part) => {
      // Placeholders like {count} must stay untouched.
      const accented = part.replace(/(\{[^}]*\})|([A-Za-z])/g, (match, placeholder: string) =>
        placeholder ? placeholder : (ACCENTS[match] ?? match),
      );
      const padding = '~'.repeat(Math.max(2, Math.round(part.trim().length * 0.4)));
      return `⟦${accented.trim()} ${padding}⟧`;
    })
    .join(' | ');
}

type Messages = { [key: string]: string | Messages };

export function pseudoMessages(messages: Messages): Messages {
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      typeof value === 'string' ? pseudoText(value) : pseudoMessages(value),
    ]),
  );
}
