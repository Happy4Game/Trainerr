import type { SqlDatabase } from './database';
import { migrations as defaultMigrations, type Migration } from './migrations';

/**
 * The schema version lives in its own table rather than in PRAGMA user_version,
 * which the Capacitor SQLite plugin uses for its own upgrade mechanism.
 */
const VERSION_TABLE = 'schema_version';

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  await db.executeScript(
    `CREATE TABLE IF NOT EXISTS ${VERSION_TABLE} (version INTEGER NOT NULL, applied_at TEXT NOT NULL);`,
  );
  const rows = await db.query<{ version: number | null }>(
    `SELECT MAX(version) AS version FROM ${VERSION_TABLE}`,
  );
  return rows[0]?.version ?? 0;
}

/**
 * Brings the database up to the latest schema version. Each migration runs in
 * its own transaction together with the version bump, so a failure leaves the
 * database at the previous version, untouched.
 */
export async function migrate(
  db: SqlDatabase,
  migrations: readonly Migration[] = defaultMigrations,
  now: () => Date = () => new Date(),
): Promise<{ from: number; to: number }> {
  assertOrdered(migrations);
  const from = await getSchemaVersion(db);
  const latest = migrations.at(-1)?.version ?? 0;
  if (from > latest) {
    throw new Error(
      `La base est en version ${from}, plus récente que l'appli (${latest}). Mets l'appli à jour.`,
    );
  }
  for (const migration of migrations) {
    if (migration.version <= from) continue;
    await db.executeScript(
      `${migration.sql}\nINSERT INTO ${VERSION_TABLE} (version, applied_at) VALUES (${migration.version}, '${now().toISOString()}');`,
    );
  }
  return { from, to: Math.max(from, latest) };
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(`Migration ${index + 1} attendue, version ${migration.version} trouvée.`);
    }
  });
}
