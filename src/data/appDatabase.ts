import { i18n } from '@/i18n';
import { CATALOG_VERSION } from './catalog/version';
import { storedCatalogVersion } from './repositories/catalogRepository';
import { ensureDefaultGym } from './repositories/gymRepository';
import type { SqlDatabase } from './sqlite/database';
import { migrate } from './sqlite/migrate';

let opening: Promise<{ db: SqlDatabase; schemaVersion: number }> | undefined;

/**
 * Opens the phone database once, brings its schema up to date and imports the
 * bundled exercise catalog when it changed.
 */
export function openAppDatabase(): Promise<{ db: SqlDatabase; schemaVersion: number }> {
  opening ??= (async () => {
    const { CapacitorDatabase } = await import('./sqlite/capacitorDatabase');
    const db = await CapacitorDatabase.open();
    const { to } = await migrate(db);
    await ensureDefaultGym(db, i18n.global.t('gym.defaultName'));
    if ((await storedCatalogVersion(db)) !== CATALOG_VERSION) {
      // The catalog (~500 exercises) is loaded in its own chunk, only when it changed.
      const [{ buildCatalog }, { seedCatalog }] = await Promise.all([
        import('./catalog/catalog'),
        import('./repositories/catalogRepository'),
      ]);
      await seedCatalog(db, buildCatalog(), CATALOG_VERSION);
    }
    return { db, schemaVersion: to };
  })();
  opening.catch(() => {
    opening = undefined;
  });
  return opening;
}
