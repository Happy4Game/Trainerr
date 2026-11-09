/** Translation keys of the labels of a guided routine (GuidedSteps.vue). */
export interface GuidedLabels {
  readonly title: string;
  readonly stepOf: string;
  readonly part: string;
  readonly next: string;
  readonly previous: string;
  readonly finish: string;
  readonly skip: string;
  readonly why: string;
}

export const WARMUP_LABELS: GuidedLabels = {
  title: 'guidedWarmup.title',
  stepOf: 'guidedWarmup.stepOf',
  part: 'guidedWarmup.part',
  next: 'guidedWarmup.next',
  previous: 'guidedWarmup.previous',
  finish: 'guidedWarmup.finish',
  skip: 'guidedWarmup.skip',
  why: 'guidedWarmup.why',
};

export const STRETCHING_LABELS: GuidedLabels = {
  title: 'guidedStretching.title',
  stepOf: 'guidedStretching.stepOf',
  part: 'guidedStretching.part',
  next: 'guidedStretching.next',
  previous: 'guidedStretching.previous',
  finish: 'guidedStretching.finish',
  skip: 'guidedStretching.skip',
  why: 'guidedStretching.why',
};
