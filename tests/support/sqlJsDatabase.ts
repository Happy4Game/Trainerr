import initSqlJs, { type Database } from 'sql.js';
import type { SqlDatabase, SqlValue } from '@/data/sqlite/database';

/** In-memory SqlDatabase for tests, running the same SQLite engine as the browser build. */
export class SqlJsDatabase implements SqlDatabase {
  private constructor(readonly raw: Database) {}

  static async create(dump?: string): Promise<SqlJsDatabase> {
    const SQL = await initSqlJs();
    const db = new SqlJsDatabase(new SQL.Database());
    db.raw.exec('PRAGMA foreign_keys = ON;');
    if (dump) db.raw.exec(dump);
    return db;
  }

  async executeScript(sql: string): Promise<void> {
    this.raw.exec('BEGIN');
    try {
      this.raw.exec(sql);
      this.raw.exec('COMMIT');
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    this.raw.run(sql, [...params]);
  }

  async query<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
    const statement = this.raw.prepare(sql, [...params]);
    const rows: Row[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as Row);
    statement.free();
    return rows;
  }
}
