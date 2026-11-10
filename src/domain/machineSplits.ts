/**
 * A catalog exercise that turned out to be two different machines (the leg
 * press: 45° sled and horizontal seat). Their loads do not compare, so each one
 * gets its own exercise and history. The sets logged before the split are on
 * the first one: after the update, the user says on which machine they were
 * done, and everything moves there once.
 */
export interface MachineSplit {
  /** Kept in the settings once answered: never asked again. */
  readonly id: string;
  /** The exercise that held every set before the split. */
  readonly fromId: string;
  /** The machines to choose from; the first one is `fromId` (nothing moves). */
  readonly choices: readonly string[];
}

export const MACHINE_SPLITS: readonly MachineSplit[] = [
  {
    id: 'legPress',
    fromId: 'Leg_Press',
    choices: ['Leg_Press', 'trainerr:seated-leg-press'],
  },
  {
    id: 'seatedRow',
    fromId: 'Seated_Cable_Rows',
    choices: ['Seated_Cable_Rows', 'trainerr:diverging-seated-row'],
  },
];

/**
 * The first split still to ask about: only to users who logged sets on the
 * machine split. The others have nothing to move, so nothing to answer.
 */
export function pendingSplit(
  splits: readonly MachineSplit[],
  answered: Readonly<Record<string, string>>,
  hasSets: (exerciseId: string) => boolean,
): MachineSplit | undefined {
  return splits.find((s) => answered[s.id] === undefined && hasSets(s.fromId));
}

/** The parts of the settings that name a machine. */
export interface MachineSettings {
  readonly machineRepRanges?: Readonly<Record<string, unknown>>;
  readonly swaps?: Readonly<Record<string, string>>;
  readonly customSessions?: readonly {
    readonly exerciseIds: readonly string[];
    readonly lines?: Readonly<Record<string, unknown>>;
  }[];
}

const renameKey = <V>(
  record: Readonly<Record<string, V>>,
  fromId: string,
  toId: string,
): Record<string, V> =>
  Object.fromEntries(
    Object.entries(record)
      // A value already set on the new machine wins.
      .filter(([key]) => !(key === fromId && toId in record))
      .map(([key, value]) => [key === fromId ? toId : key, value]),
  );

/**
 * The settings once the machine `fromId` is called `toId`: its own rep range,
 * the user's sessions, and the ready-made sessions that still name `fromId`
 * now propose `toId` (a swap), as the user would have done by hand.
 */
export function moveMachineSettings<S extends MachineSettings>(
  settings: S,
  fromId: string,
  toId: string,
): S {
  if (fromId === toId) return settings;
  const swaps = Object.fromEntries(
    Object.entries(settings.swaps ?? {}).map(([from, to]) => [from, to === fromId ? toId : to]),
  );
  // The ready-made sessions name the old machine: they propose the new one.
  if (swaps[fromId] === undefined) swaps[fromId] = toId;
  return {
    ...settings,
    ...(settings.machineRepRanges
      ? { machineRepRanges: renameKey(settings.machineRepRanges, fromId, toId) }
      : {}),
    swaps,
    ...(settings.customSessions
      ? {
          customSessions: settings.customSessions.map((s) => ({
            ...s,
            exerciseIds: [...new Set(s.exerciseIds.map((id) => (id === fromId ? toId : id)))],
            ...(s.lines ? { lines: renameKey(s.lines, fromId, toId) } : {}),
          })),
        }
      : {}),
  };
}
