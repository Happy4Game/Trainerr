/**
 * "Nouveautés" page, newest first. Texts live in the translation files
 * (`changelog.items.<id>`), written for users, not developers. Add an entry
 * with each pull request that changes what the user sees.
 */
export interface ChangelogEntry {
  /** Title in `changelog.titles.<id>`. */
  readonly id: string;
  /** ISO date of the merge on main. */
  readonly date: string;
  readonly items: readonly string[];
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    id: 'clearerSession',
    date: '2026-10-27',
    items: ['feedback', 'changelog', 'scrollTop', 'steppers'],
  },
  {
    id: 'wholeWeek',
    date: '2026-10-27',
    items: [
      'neglected',
      'closeMachines',
      'addToPlan',
      'noLoadCap',
      'muscleSearch',
      'updateCheck',
      'pastSession',
    ],
  },
  {
    id: 'newLook',
    date: '2026-10-27',
    items: ['design', 'stats', 'exports', 'notInShape', 'trophies', 'shareRecap'],
  },
  {
    id: 'firstRelease',
    date: '2026-10-26',
    items: ['presets', 'swapMachine', 'machineSetup', 'assisted', 'restScreen', 'autoUpdate'],
  },
];
