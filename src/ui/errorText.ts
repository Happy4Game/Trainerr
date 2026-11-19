import { AppError } from '@/domain/appError';
import { i18n } from '@/i18n';

/**
 * The sentence shown to the user for an error: its translation when the app
 * knows it, otherwise a general sentence (a raw technical message, from
 * SQLite for instance, would mean nothing to the user).
 */
export function errorText(error: unknown): string {
  const { t } = i18n.global;
  if (error instanceof AppError) return t(`errors.${error.code}`);
  console.error(error);
  return t('errors.unexpected');
}
