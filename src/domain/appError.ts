/**
 * An error the user can understand, named by a code: the interface turns the
 * code into a sentence in the user's language (`errors.<code>`), so that no
 * French text reaches an English user.
 */
export type AppErrorCode =
  | 'notABackup'
  | 'backupTooNew'
  | 'invalidBackup'
  | 'wrongPassword'
  | 'csvHasLoads'
  | 'csvHasWeights'
  | 'csvUnknownWorkouts'
  | 'csvUnknownLoads'
  | 'csvUnknownWeights';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode) {
    super(code);
    this.name = 'AppError';
    this.code = code;
  }
}
