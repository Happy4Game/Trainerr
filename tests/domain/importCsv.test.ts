import { describe, expect, it } from 'vitest';
import { parseCsv, parseWorkoutCsv, suggestMatches, toIsoDate } from '@/domain/importCsv';

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
