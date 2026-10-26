/** What the screen tells the user before a set, compared with what they did before. */
export type SetAdvice = 'moreLoad' | 'moreReps' | 'same' | 'lighter' | 'first' | 'comeback';

export function setAdvice(
  proposal: { readonly loadKg: number; readonly targetReps: number; readonly reason: string },
  previous: { readonly loadKg: number; readonly reps: number } | undefined,
): SetAdvice {
  if (proposal.reason === 'comeback') return 'comeback';
  if (!previous) return 'first';
  if (proposal.loadKg > previous.loadKg) return 'moreLoad';
  if (proposal.loadKg < previous.loadKg) return 'lighter';
  return proposal.targetReps > previous.reps ? 'moreReps' : 'same';
}
