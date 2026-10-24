import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSchemaVersion, migrate } from '@/data/sqlite/migrate';
import { latestSchemaVersion, migrations, type Migration } from '@/data/sqlite/migrations';
import { SqlJsDatabase } from '../support/sqlJsDatabase';

const fixturesDir = resolve(import.meta.dirname, '../fixtures/db');
const TABLES = [
  'availability',
  'badge',
  'body_measurement',
  'exercise',
  'exercise_muscle',
  'gym',
  'gym_machine',
  'muscle',
  'reference_load',
  'schema_version',
  'session',
  'set_log',
  'training_cycle',
];

async function tableNames(db: SqlJsDatabase): Promise<string[]> {
  const rows = await db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

async function dumpData(db: SqlJsDatabase, tables: readonly string[]) {
  const data: Record<string, unknown[]> = {};
  for (const table of tables) {
    data[table] = await db.query(`SELECT * FROM ${table} ORDER BY rowid`);
  }
  return data;
}

describe('migrations', () => {
  it('are numbered 1, 2, 3… without gaps', () => {
    migrations.forEach((migration, index) => expect(migration.version).toBe(index + 1));
  });

  it('create the full schema on an empty database', async () => {
    const db = await SqlJsDatabase.create();
    const result = await migrate(db);
    expect(result).toEqual({ from: 0, to: latestSchemaVersion });
    expect(await getSchemaVersion(db)).toBe(latestSchemaVersion);
    expect(await tableNames(db)).toEqual(TABLES);
  });

  it('do nothing when run twice', async () => {
    const db = await SqlJsDatabase.create();
    await migrate(db);
    const result = await migrate(db);
    expect(result).toEqual({ from: latestSchemaVersion, to: latestSchemaVersion });
  });

  it('refuse a database newer than the app', async () => {
    const db = await SqlJsDatabase.create(
      `CREATE TABLE schema_version (version INTEGER NOT NULL, applied_at TEXT NOT NULL);
       INSERT INTO schema_version VALUES (${latestSchemaVersion + 1}, '2030-01-01T00:00:00.000Z');`,
    );
    await expect(migrate(db)).rejects.toThrow(/plus récente/);
  });

  it('roll back a failing migration and keep the previous version', async () => {
    const db = await SqlJsDatabase.create();
    await migrate(db);
    const broken: Migration[] = [
      ...migrations,
      {
        version: latestSchemaVersion + 1,
        description: 'broken',
        sql: 'CREATE TABLE half_done (id TEXT); INSERT INTO missing_table VALUES (1);',
      },
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(latestSchemaVersion);
    expect(await tableNames(db)).not.toContain('half_done');
  });

  it('reject an out-of-order migration list', async () => {
    const db = await SqlJsDatabase.create();
    const gap: Migration[] = [{ version: 2, description: 'gap', sql: '' }];
    await expect(migrate(db, gap)).rejects.toThrow(/attendue/);
  });

  const fixtures = readdirSync(fixturesDir).filter((file) => /^v\d+\.sql$/.test(file));

  it.each(fixtures)('upgrade the frozen %s database without losing data', async (file) => {
    const dump = readFileSync(resolve(fixturesDir, file), 'utf8');
    const db = await SqlJsDatabase.create(dump);
    const before = await dumpData(db, await tableNames(db));

    await migrate(db);

    expect(await getSchemaVersion(db)).toBe(latestSchemaVersion);
    const after = await dumpData(db, Object.keys(before));
    for (const [table, rows] of Object.entries(before)) {
      for (const row of rows) {
        expect(after[table]).toContainEqual(expect.objectContaining(row as object));
      }
    }
  });

  it('keep the frozen fixture schema identical to what migrations produce', async () => {
    const version = latestSchemaVersion;
    const dump = readFileSync(resolve(fixturesDir, `v${version}.sql`), 'utf8');
    const fromFixture = await SqlJsDatabase.create(dump);
    const fromMigrations = await SqlJsDatabase.create();
    await migrate(fromMigrations);
    const columns = async (db: SqlJsDatabase) => {
      const result: Record<string, unknown[]> = {};
      for (const table of TABLES) {
        result[table] = await db.query(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('${table}')`,
        );
      }
      return result;
    };
    expect(await columns(fromMigrations)).toEqual(await columns(fromFixture));
  });

  it('enforce foreign keys and value constraints', async () => {
    const db = await SqlJsDatabase.create();
    await migrate(db);
    await expect(
      db.run(
        "INSERT INTO set_log VALUES ('x', 'no-session', 'no-ex', 1, 10, 8, 'ok', 0, 0, 1, NULL)",
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
    await expect(
      db.run(
        "INSERT INTO exercise VALUES ('e', 'E', NULL, '[]', 'arms', 'isolation', 'machine', NULL, NULL)",
      ),
    ).rejects.toThrow(/CHECK/);
  });
});
