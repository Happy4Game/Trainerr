-- Base d'exemple figée en version 6 du schéma (RIR et note par série), avec des séances réelles d'octobre 2026.
-- Ne jamais modifier ce fichier : il prouve que les futures migrations conservent les données.
-- Pour une nouvelle version du schéma, ajouter un fichier v2.sql, v3.sql, etc.
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
CREATE TABLE muscle (id TEXT PRIMARY KEY, name TEXT NOT NULL, svg_zone TEXT NOT NULL, muscle_group TEXT NOT NULL);
CREATE TABLE exercise_muscle (
  exercise_id TEXT NOT NULL REFERENCES exercise (id) ON DELETE CASCADE,
  muscle_id TEXT NOT NULL REFERENCES muscle (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary')),
  PRIMARY KEY (exercise_id, muscle_id)
);
CREATE TABLE gym (id TEXT PRIMARY KEY, name TEXT NOT NULL);
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
  discomfort_zone TEXT,
  rir INTEGER CHECK (rir BETWEEN 0 AND 4),
  note TEXT
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
CREATE TABLE badge (code TEXT PRIMARY KEY, earned_on TEXT NOT NULL);
CREATE TABLE body_measurement (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  weight_kg REAL,
  measurements TEXT NOT NULL DEFAULT '{}',
  photo_path TEXT
);
CREATE TABLE training_cycle (id TEXT PRIMARY KEY, start_date TEXT NOT NULL, end_date TEXT NOT NULL, kind TEXT NOT NULL);
CREATE TABLE schema_version (version INTEGER NOT NULL, applied_at TEXT NOT NULL);
INSERT INTO schema_version VALUES (1, '2026-10-15T19:02:11.000Z');
ALTER TABLE exercise ADD COLUMN name_en TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise ADD COLUMN cues TEXT;
ALTER TABLE exercise ADD COLUMN cues_source TEXT;
ALTER TABLE exercise ADD COLUMN instructions_en TEXT NOT NULL DEFAULT '[]';
ALTER TABLE exercise ADD COLUMN source TEXT NOT NULL DEFAULT 'user';
CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO schema_version VALUES (2, '2026-10-24T12:00:00.000Z');
ALTER TABLE session ADD COLUMN plan TEXT NOT NULL DEFAULT '{}';
INSERT INTO schema_version VALUES (3, '2026-10-24T13:00:00.000Z');
ALTER TABLE exercise ADD COLUMN cues_en TEXT;
INSERT INTO schema_version VALUES (4, '2026-10-25T09:00:00.000Z');
ALTER TABLE gym_machine ADD COLUMN machine_setup TEXT NOT NULL DEFAULT '{}';
INSERT INTO schema_version VALUES (5, '2026-10-26T21:00:00.000Z');
INSERT INTO schema_version VALUES (6, '2026-10-27T09:00:00.000Z');

INSERT INTO exercise VALUES ('Dumbbell_Bench_Press', 'Développé couché haltères', NULL, '["DC haltères"]', 'push', 'heavyCompound', 'dumbbell', NULL, NULL, 'Dumbbell Bench Press', '["Coudes à environ 45° du corps"]', 'BarBend, Eric Cressey', '["Lie down on a flat bench."]', 'free-exercise-db', '["Elbows at about 45° from the body"]');
INSERT INTO exercise VALUES ('Leg_Press', 'Presse à cuisses', 'Leg Press', '[]', 'legs', 'heavyCompound', 'machine', NULL, NULL, 'Leg Press', NULL, NULL, '[]', 'free-exercise-db', NULL);
INSERT INTO exercise VALUES ('Butterfly', 'Écarté à la machine', 'Pec Fly', '[]', 'push', 'isolation', 'machine', NULL, NULL, 'Butterfly', NULL, NULL, '[]', 'free-exercise-db', NULL);
INSERT INTO app_meta VALUES ('catalog_version', 'f00c92c-1');
INSERT INTO muscle VALUES ('chest', 'Pectoraux', 'pectoraux', 'chest');
INSERT INTO muscle VALUES ('quads', 'Quadriceps', 'quadriceps', 'legs');
INSERT INTO exercise_muscle VALUES ('Dumbbell_Bench_Press', 'chest', 'primary');
INSERT INTO exercise_muscle VALUES ('Butterfly', 'chest', 'primary');
INSERT INTO exercise_muscle VALUES ('Leg_Press', 'quads', 'primary');
INSERT INTO gym VALUES ('home-gym', 'Salle habituelle');
INSERT INTO gym_machine VALUES ('gm-1', 'home-gym', 'Butterfly', '[32,39,45,52,59,66]', 1, NULL, '{"seat":4}', '{"addOnsKg":[1.25,2.5],"seat":"4","notch":"2"}');
INSERT INTO gym_machine VALUES ('gm-2', 'home-gym', 'Leg_Press', '[80,90,100,107,110,117,127]', 1, NULL, NULL, '{}');
INSERT INTO session VALUES ('s-2026-10-15', '2026-10-15', 'pushA', 'done', 'home-gym', 'Reprise après 6 mois', '{"exercises":[{"exerciseId":"Dumbbell_Bench_Press","sets":3}]}');
INSERT INTO session VALUES ('s-2026-10-17', '2026-10-17', 'legsA', 'done', 'home-gym', NULL, '{}');
INSERT INTO set_log VALUES ('l-1', 's-2026-10-15', 'Dumbbell_Bench_Press', 1, 16, 12, 'ok', 0, 0, 1, NULL, 2, 'prise qui glisse');
INSERT INTO set_log VALUES ('l-2', 's-2026-10-15', 'Dumbbell_Bench_Press', 2, 18, 9.5, 'hard', 0, 0, 1, NULL, NULL, NULL);
INSERT INTO set_log VALUES ('l-3', 's-2026-10-15', 'Butterfly', 3, 52, 12, 'ok', 0, 0, 1, NULL, NULL, NULL);
INSERT INTO set_log VALUES ('l-4', 's-2026-10-17', 'Leg_Press', 1, 90, 12, 'easy', 0, 0, 1, NULL, NULL, NULL);
INSERT INTO reference_load VALUES ('Dumbbell_Bench_Press', 22, 8, '2026-04-10');
INSERT INTO reference_load VALUES ('Leg_Press', 127, 10, '2026-04-10');
INSERT INTO availability VALUES ('a-1', 1, '21:00', '23:00', 'free');
INSERT INTO availability VALUES ('a-2', 2, '17:00', '20:00', 'blocked');
INSERT INTO badge VALUES ('first-session', '2026-10-15');
INSERT INTO body_measurement VALUES ('m-1', '2026-10-15', 72.5, '{"arm":33}', NULL);
