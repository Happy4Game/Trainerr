import { describe, expect, it } from 'vitest';
import { deviceFromUserAgent, FEEDBACK_EMAIL, feedbackMailto } from '@/domain/feedback';

describe('feedback by mail', () => {
  it('keeps the Android version and the phone model of a WebView user agent', () => {
    expect(
      deviceFromUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Android 14; Pixel 7');
    expect(
      deviceFromUserAgent(
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/130 Mobile',
      ),
    ).toBe('Android 10');
  });

  it('prefills the subject and the body, with the details under a line', () => {
    const link = feedbackMailto({
      subject: 'Trainerr : mon retour',
      intro: 'Bonjour Thibaut,\n\nÉcris ici & ici ?',
      version: '1.0.9 (9)',
      device: 'Android 14; Pixel 7',
      language: 'fr-FR',
    });
    expect(link.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`)).toBe(true);
    const url = new URL(link);
    expect(url.searchParams.get('subject')).toBe('Trainerr : mon retour');
    expect(url.searchParams.get('body')).toBe(
      'Bonjour Thibaut,\r\n\r\nÉcris ici & ici ?\r\n\r\n\r\n—\r\nTrainerr 1.0.9 (9)\r\nAndroid 14; Pixel 7\r\nfr-FR',
    );
    // RFC 6068: spaces are %20, never "+", which some mail apps keep as is.
    expect(link).not.toContain('+');
  });
});
