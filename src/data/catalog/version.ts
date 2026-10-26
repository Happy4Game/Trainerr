import { CURATED_VERSION } from './curated';

/** Commit of free-exercise-db bundled in free-exercise-db.json (checked by a test). */
export const SOURCE_COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';

/**
 * Changes when the source data or the curated additions change. Kept apart from
 * the catalog itself so that the app can check it without loading 500 exercises.
 */
export const CATALOG_VERSION = `${SOURCE_COMMIT.slice(0, 7)}-${CURATED_VERSION}`;
