/** Error types for model loading. Kept free of tfjs imports so UI code and tests can use them cheaply. */

export type LoadErrorKind = 'network' | 'invalid' | 'timeout' | 'aborted';

export class ClassifierLoadError extends Error {
  constructor(
    public readonly kind: LoadErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ClassifierLoadError';
  }
}

/** Human-readable text for any load failure, for the error card. */
export function describeLoadError(error: unknown): { kind: LoadErrorKind | 'unknown'; message: string } {
  if (error instanceof ClassifierLoadError) return { kind: error.kind, message: error.message };
  if (error instanceof Error) return { kind: 'unknown', message: error.message };
  return { kind: 'unknown', message: String(error) };
}

/** Short heading for the error card, by kind. */
export function loadErrorTitle(kind: LoadErrorKind | 'unknown'): string {
  switch (kind) {
    case 'network':
      return 'Could not reach the model';
    case 'invalid':
      return 'This model cannot be used';
    case 'timeout':
      return 'Loading timed out';
    case 'aborted':
      return 'Loading was cancelled';
    default:
      return 'Something went wrong';
  }
}
