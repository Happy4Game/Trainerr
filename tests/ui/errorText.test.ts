import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/domain/appError';
import { i18n } from '@/i18n';
import { errorText } from '@/ui/errorText';

describe('error shown to the user', () => {
  afterEach(() => {
    i18n.global.locale.value = 'fr-FR';
    vi.restoreAllMocks();
  });

  it('speaks the language of the app, never the language of the code', () => {
    i18n.global.locale.value = 'en-US';
    expect(errorText(new AppError('wrongPassword'))).toBe('Wrong password, or damaged file.');
    i18n.global.locale.value = 'fr-FR';
    expect(errorText(new AppError('wrongPassword'))).toBe(
      'Mot de passe incorrect, ou fichier abîmé.',
    );
  });

  it('hides a technical message behind a general sentence', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const text = errorText(new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'));
    expect(text).not.toContain('SQLITE');
    expect(text).toBe(i18n.global.t('errors.unexpected'));
  });
});
