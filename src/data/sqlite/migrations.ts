export interface Migration {
  readonly version: number;
  readonly description: string;
  readonly sql: string;
}

/**
 * Versioned schema. A migration is never edited once released: any schema
 * change is a new entry appended at the end (see docs/adr/0003).
 *
 * Arrays (load steps, aliases) are stored as JSON text. Dates are ISO 8601,
 * in UTC for timestamps. Loads are always stored in kg.
 */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    sql: `
      CREATE TABLE exercise (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        machine_name TEXT,
        aliases TEXT NOT NULL DEFAULT '[]',
        ppl_group TEXT NOT NULL CHECK (ppl_group IN ('push', 'pull', 'legs', 'core')),
        kind TEXT NOT NULL CHECK (kind IN ('heavyCompound', 'machineCompound', 'isolation')),
        equipment TEXT NOT NULL,
        rep_range_min INTEGER,
        rep_range_max INTEGER
      );

      CREATE TABLE muscle (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        svg_zone TEXT NOT NULL,
        muscle_group TEXT NOT NULL
      );

      CREATE TABLE exercise_muscle (
        exercise_id TEXT NOT NULL REFERENCES exercise (id) ON DELETE CASCADE,
        muscle_id TEXT NOT NULL REFERENCES muscle (id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('primary', 'secondary')),
        PRIMARY KEY (exercise_id, muscle_id)
      );

      CREATE TABLE gym (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE gym_machine (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL REFERENCES gym (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercise (id) ON DELETE CASCADE,
        load_steps_kg TEXT NOT NULL DEFAULT '[]',
        favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
        plate_photo TEXT,
        settings TEXT,
        UNIQUE (gym_id, exercise_id)
      );

      CREATE TABLE session (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        template TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('planned', 'inProgress', 'done', 'skipped')),
        gym_id TEXT REFERENCES gym (id) ON DELETE SET NULL,
        note TEXT
      );
      CREATE INDEX session_date ON session (date);

      CREATE TABLE set_log (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES session (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercise (id),
        position INTEGER NOT NULL,
        load_kg REAL NOT NULL,
        reps REAL NOT NULL,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'ok', 'hard', 'fail')),
        warmup INTEGER NOT NULL DEFAULT 0 CHECK (warmup IN (0, 1)),
        slow_tempo INTEGER NOT NULL DEFAULT 0 CHECK (slow_tempo IN (0, 1)),
        complete_reps INTEGER NOT NULL DEFAULT 1 CHECK (complete_reps IN (0, 1)),
        discomfort_zone TEXT
      );
      CREATE INDEX set_log_exercise ON set_log (exercise_id);
      CREATE INDEX set_log_session ON set_log (session_id);

      CREATE TABLE reference_load (
        exercise_id TEXT PRIMARY KEY REFERENCES exercise (id) ON DELETE CASCADE,
        load_kg REAL NOT NULL,
        reps REAL NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE availability (
        id TEXT PRIMARY KEY,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('free', 'blocked', 'tiredLegs'))
      );

      CREATE TABLE badge (
        code TEXT PRIMARY KEY,
        earned_on TEXT NOT NULL
      );

      CREATE TABLE body_measurement (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        weight_kg REAL,
        measurements TEXT NOT NULL DEFAULT '{}',
        photo_path TEXT
      );

      CREATE TABLE training_cycle (
        id TEXT PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        kind TEXT NOT NULL
      );
    `,
  },
];

export const latestSchemaVersion = migrations.at(-1)?.version ?? 0;
