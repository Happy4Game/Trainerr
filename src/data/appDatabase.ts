import type { SqlDatabase } from './sqlite/database';
import { migrate } from './sqlite/migrate';

let opening: Promise<{ db: SqlDatabase; schemaVersion: number }> | undefined;

/** Opens the phone database once and brings its schema up to date. */
export function openAppDatabase(): Promise<{ db: SqlDatabase; schemaVersion: number }> {
  opening ??= (async () => {
    const { CapacitorDatabase } = await import('./sqlite/capacitorDatabase');
    const db = await CapacitorDatabase.open();
    const { to } = await migrate(db);
    return { db, schemaVersion: to };
  })();
  return opening;
}
