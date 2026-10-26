import type { IsoDate, SessionLog } from '@/domain/types';

/**
 * Readable summary of the program and the history for a coach: a standalone
 * HTML page that can be opened anywhere or printed to PDF.
 */
export interface CoachReportInput {
  readonly generatedOn: IsoDate;
  readonly program: readonly [label: string, value: string][];
  readonly sessions: readonly SessionLog[];
  readonly exerciseName: (id: string) => string;
  readonly templateName: (id: string) => string;
  readonly loadLabel: (kg: number) => string;
  readonly difficultyLabel: (difficulty: string) => string;
  readonly texts: {
    readonly title: string;
    readonly program: string;
    readonly history: string;
    readonly warmup: string;
    readonly note: string;
  };
  readonly lang: string;
}

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export function buildCoachReport(input: CoachReportInput): string {
  const { texts } = input;
  const program = input.program
    .map(([label, value]) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`)
    .join('');
  const sessions = [...input.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((session) => {
      const rows = session.sets
        .map(
          (set) =>
            `<li>${escape(input.exerciseName(set.exerciseId))} — ${escape(input.loadLabel(set.loadKg))} × ${set.reps}` +
            ` (${escape(set.warmup ? texts.warmup : input.difficultyLabel(set.difficulty))})</li>`,
        )
        .join('');
      return `<section><h3>${escape(session.date)} · ${escape(input.templateName(session.templateId))}</h3><ul>${rows}</ul></section>`;
    })
    .join('');
  return `<!doctype html>
<html lang="${escape(input.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(texts.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.5}th{text-align:left;padding-right:1rem}section{border-top:1px solid #ddd}</style>
</head><body>
<h1>${escape(texts.title)}</h1>
<p>${escape(input.generatedOn)}</p>
<h2>${escape(texts.program)}</h2><table>${program}</table>
<h2>${escape(texts.history)}</h2>${sessions}
<p><small>${escape(texts.note)}</small></p>
</body></html>
`;
}
