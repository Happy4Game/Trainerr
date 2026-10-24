import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type { SqlDatabase, SqlValue } from './database';

const DATABASE_NAME = 'trainerr';

/** SqlDatabase backed by Capacitor SQLite (native) or jeep-sqlite (browser). */
export class CapacitorDatabase implements SqlDatabase {
  private constructor(
    private readonly sqlite: SQLiteConnection,
    private readonly connection: SQLiteDBConnection,
    private readonly isWeb: boolean,
  ) {}

  static async open(): Promise<CapacitorDatabase> {
    const isWeb = Capacitor.getPlatform() === 'web';
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    if (isWeb) {
      await initWebStore(sqlite);
    }
    const consistency = await sqlite.checkConnectionsConsistency();
    const exists = (await sqlite.isConnection(DATABASE_NAME, false)).result;
    const connection =
      consistency.result && exists
        ? await sqlite.retrieveConnection(DATABASE_NAME, false)
        : await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', 1, false);
    await connection.open();
    await connection.execute('PRAGMA foreign_keys = ON;', false);
    return new CapacitorDatabase(sqlite, connection, isWeb);
  }

  async executeScript(sql: string): Promise<void> {
    await this.connection.execute(sql, true);
    await this.persist();
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    await this.connection.run(sql, [...params], true);
    await this.persist();
  }

  async query<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
    const result = await this.connection.query(sql, [...params]);
    return (result.values ?? []) as Row[];
  }

  /** In the browser, jeep-sqlite keeps the database in memory until it is saved to IndexedDB. */
  private async persist(): Promise<void> {
    if (this.isWeb) {
      await this.sqlite.saveToStore(DATABASE_NAME);
    }
  }
}

async function initWebStore(sqlite: SQLiteConnection): Promise<void> {
  const { defineCustomElements } = await import('jeep-sqlite/loader');
  await defineCustomElements(window);
  if (!document.querySelector('jeep-sqlite')) {
    const element = document.createElement('jeep-sqlite');
    element.setAttribute('autosave', 'true');
    document.body.appendChild(element);
  }
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}
