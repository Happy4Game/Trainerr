export type SqlValue = string | number | null;

/**
 * Minimal SQLite access used by the data layer. Two implementations exist:
 * Capacitor SQLite on the phone, sql.js in tests.
 */
export interface SqlDatabase {
  /** Runs a multi-statement script atomically: everything is applied or nothing is. */
  executeScript(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  query<Row extends object>(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
}
