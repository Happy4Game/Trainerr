import { describe, expect, it } from 'vitest';
import {
  detectFormat,
  parseCsv,
  parseLoadsCsv,
  parseWorkoutCsv,
  suggestMatches,
  toIsoDate,
} from '@/domain/importCsv';

const STRONG = `Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE
2026-10-15 19:02:11;Push A;55m;Bench Press (Dumbbell);W;8;15;0;0;;;
2026-10-15 19:02:11;Push A;55m;Bench Press (Dumbbell);1;16;12;0;0;;;
2026-10-15 19:02:11;Push A;55m;"Chest Fly (Machine)";1;52;12;0;0;"bonne, ""propre""";;
2026-10-17 18:30:00;Legs A;48m;Leg Press;1;90;12;0;0;;;`;

const HEVY = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
"Legs B","24 Oct 2026, 18:00","24 Oct 2026, 19:00","","Leg Press (Machine)",,"",0,normal,107,10,,,
"Legs B","24 Oct 2026, 18:00","24 Oct 2026, 19:00","","Leg Press (Machine)",,"",1,normal,107,10,,,
"Legs B","24 Oct 2026, 18:00","24 Oct 2026, 19:00","","Leg Extension (Machine)",,"",0,warmup,30,15,,,`;

describe('import from other apps', () => {
  it('reads quoted CSV fields with doubled quotes and semicolons', () => {
    expect(parseCsv('a;b\n"x;y";"il dit ""ok"""')).toEqual([
      ['a', 'b'],
      ['x;y', 'il dit "ok"'],
    ]);
  });

  it('reads a Strong export, one session per day and workout', () => {
    const { format, sessions } = parseWorkoutCsv(STRONG);
    expect(format).toBe('strong');
    expect(sessions).toEqual([
      {
        date: '2026-10-15',
        title: 'Push A',
        sets: [
          { exerciseName: 'Bench Press (Dumbbell)', loadKg: 8, reps: 15, warmup: true },
          { exerciseName: 'Bench Press (Dumbbell)', loadKg: 16, reps: 12, warmup: false },
          { exerciseName: 'Chest Fly (Machine)', loadKg: 52, reps: 12, warmup: false },
        ],
      },
      {
        date: '2026-10-17',
        title: 'Legs A',
        sets: [{ exerciseName: 'Leg Press', loadKg: 90, reps: 12, warmup: false }],
      },
    ]);
  });

  it('converts Strong pounds to kg when the export is in lb', () => {
    const { sessions } = parseWorkoutCsv(STRONG, { strongUnit: 'lb' });
    expect(sessions[1]?.sets[0]?.loadKg).toBe(40.823);
  });

  it('reads a Hevy export, warm-up sets included', () => {
    const { format, sessions } = parseWorkoutCsv(HEVY);
    expect(format).toBe('hevy');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ date: '2026-10-24', title: 'Legs B' });
    expect(sessions[0]?.sets.map((s) => [s.loadKg, s.reps, s.warmup])).toEqual([
      [107, 10, false],
      [107, 10, false],
      [30, 15, true],
    ]);
  });

  it('refuses an unknown file', () => {
    expect(() => parseWorkoutCsv('foo,bar\n1,2')).toThrow(/non reconnu/);
  });

  it('reads the usual date formats', () => {
    expect(toIsoDate('2026-10-24T19:02')).toBe('2026-10-24');
    expect(toIsoDate('4 Nov 2026, 07:00')).toBe('2026-11-04');
    expect(toIsoDate('hier')).toBeUndefined();
  });

  it('suggests the closest catalog exercises, exact names first', () => {
    const catalog = [
      { id: 'Leg_Press', names: ['Leg Press', 'Presse à cuisses', 'leg press'] },
      { id: 'Narrow_Stance_Leg_Press', names: ['Narrow Stance Leg Press'] },
      { id: 'Leg_Extensions', names: ['Leg Extensions', 'Extension des jambes'] },
      { id: 'Butterfly', names: ['Butterfly', 'Écarté à la machine', 'pec deck'] },
    ];
    expect(suggestMatches('Leg Press', catalog)[0]).toBe('Leg_Press');
    expect(suggestMatches('Leg Press (Machine)', catalog)[0]).toBe('Leg_Press');
    expect(suggestMatches('presse a cuisses', catalog)[0]).toBe('Leg_Press');
    expect(suggestMatches('Burpees', catalog)).toEqual([]);
  });
});

describe('import of the loads already lifted', () => {
  const LOADS = `exercise,load_kg,reps,date
Presse à cuisses,107,10,2026-10-24
Écarté à la machine,"52,5",12,
Tirage vertical,45,,2026-10-20
,30,10,
Tirage vertical,47.5,8,2026-10-22`;

  it('is told apart from a session export', () => {
    expect(detectFormat(['exercise', 'load_kg', 'reps'])).toBe('loads');
    expect(detectFormat(['date', 'template', 'exercise_id', 'exercise', 'load_kg', 'reps'])).toBe(
      'trainerr',
    );
    expect(() => parseWorkoutCsv(LOADS)).toThrow(/charges/);
  });

  it('one load per exercise, the last line wins, the date is optional', () => {
    expect(parseLoadsCsv(LOADS)).toEqual([
      { exerciseName: 'Presse à cuisses', loadKg: 107, reps: 10, date: '2026-10-24' },
      { exerciseName: 'Écarté à la machine', loadKg: 52.5, reps: 12 },
      { exerciseName: 'Tirage vertical', loadKg: 47.5, reps: 8, date: '2026-10-22' },
    ]);
  });

  it('refuses a file without loads', () => {
    expect(() => parseLoadsCsv('foo,bar\n1,2')).toThrow(/non reconnu/);
  });
});
