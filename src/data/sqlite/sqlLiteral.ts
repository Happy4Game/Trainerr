import type { SqlValue } from './database';

/**
 * SQL literal for bulk scripts, where bound parameters are not available
 * (Capacitor `execute` runs raw SQL). Quotes are doubled, so any text is safe.
 */
export function sqlLiteral(value: SqlValue | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Invalid SQL number: ${value}`);
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}
