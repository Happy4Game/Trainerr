import type { MuscleId } from './muscles';
import type { Exercise } from './types';

/**
 * Exercise order in a session (ACSM 2009, Simão 2012, Nunes 2021): heavy
 * compounds first, then secondary compounds, then isolation. An isolation
 * exercise never comes before a compound that works the same muscle: the
 * small muscle tired first would limit the big lift.
 */
export type OrderRole = 'mainCompound' | 'secondaryCompound' | 'isolation';

const ROLE_RANK: Readonly<Record<OrderRole, number>> = {
  mainCompound: 0,
  secondaryCompound: 1,
  isolation: 2,
};

export function roleOf(exercise: Pick<Exercise, 'kind'>): OrderRole {
  if (exercise.kind === 'heavyCompound') return 'mainCompound';
  return exercise.kind === 'machineCompound' ? 'secondaryCompound' : 'isolation';
}

export interface OrderIssue {
  /** Isolation exercise placed too early. */
  readonly isolationId: string;
  /** Later compound working the same muscle. */
  readonly compoundId: string;
  readonly muscle: MuscleId;
}

/** Isolation exercises placed before a compound that works their main muscle. */
export function orderIssues(exercises: readonly Exercise[]): OrderIssue[] {
  const issues: OrderIssue[] = [];
  exercises.forEach((isolation, index) => {
    if (roleOf(isolation) !== 'isolation') return;
    for (const compound of exercises.slice(index + 1)) {
      if (roleOf(compound) === 'isolation') continue;
      const worked = [...compound.primaryMuscles, ...compound.secondaryMuscles];
      const muscle = isolation.primaryMuscles.find((m) => worked.includes(m));
      if (muscle) {
        issues.push({ isolationId: isolation.id, compoundId: compound.id, muscle });
        return;
      }
    }
  });
  return issues;
}

/** Recommended order: by role, keeping the user's order within a role. */
export function recommendedOrder<E extends Exercise>(
  exercises: readonly E[],
  role: (exercise: E) => OrderRole = roleOf,
): E[] {
  return exercises
    .map((e, index) => ({ e, index }))
    .sort((a, b) => ROLE_RANK[role(a.e)] - ROLE_RANK[role(b.e)] || a.index - b.index)
    .map(({ e }) => e);
}
