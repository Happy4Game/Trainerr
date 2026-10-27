/**
 * "Send feedback" opens the phone's mail app with a prefilled message to
 * Thibaut. Nothing is sent by the app itself: the user reads, edits and sends
 * the mail, or not.
 */

export const FEEDBACK_EMAIL = 'dufeutrel.thibaut@gmail.com';

export interface FeedbackContext {
  readonly subject: string;
  /** Text above the details, where the user writes. */
  readonly intro: string;
  readonly version: string;
  readonly device: string;
  readonly language: string;
}

/**
 * The Android part of a user agent, e.g. "Android 14; Pixel 7" from
 * "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.004; wv) …".
 */
export function deviceFromUserAgent(userAgent: string): string {
  const inside = /\(([^)]*)\)/.exec(userAgent)?.[1];
  if (!inside) return userAgent.slice(0, 80);
  const parts = inside
    .split(';')
    .map((part) => part.replace(/\s*Build\/.*$/, '').trim())
    .filter((part) => part && part !== 'Linux' && part !== 'wv' && part !== 'K');
  return parts.join('; ');
}

/** A mailto link (RFC 6068): subject and body percent-encoded, lines in CRLF. */
export function feedbackMailto(context: FeedbackContext): string {
  const body = [
    context.intro,
    '',
    '',
    '—',
    `Trainerr ${context.version}`,
    context.device,
    context.language,
  ]
    .join('\n')
    .replace(/\r?\n/g, '\r\n');
  return (
    `mailto:${FEEDBACK_EMAIL}` +
    `?subject=${encodeURIComponent(context.subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}
