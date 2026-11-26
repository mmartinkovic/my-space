import { assertNever } from '@projectu/core-domain';
import type { ValidationIssue } from '@projectu/core-schemas';

/**
 * Expected, client-facing failures. Anything else that is thrown is treated as an internal
 * error: logged with details, answered with a generic 500.
 */
export type AppErrorDetail =
  | {
      readonly kind: 'validation';
      readonly message: string;
      readonly issues: readonly ValidationIssue[];
    }
  | {
      readonly kind:
        | 'not-found'
        | 'unauthorized'
        | 'forbidden'
        | 'conflict'
        | 'rate-limited'
        | 'upstream-unavailable';
      readonly message: string;
      /** Specific machine-readable code (e.g. `last-passkey`); defaults to the kind. */
      readonly code?: string;
    };

export type AppErrorKind = AppErrorDetail['kind'];

export class AppError extends Error {
  override readonly name = 'AppError';
  readonly detail: AppErrorDetail;

  constructor(detail: AppErrorDetail, options?: { readonly cause?: unknown }) {
    super(detail.message, options);
    this.detail = detail;
  }
}

export const statusForKind = (kind: AppErrorKind): number => {
  switch (kind) {
    case 'validation':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not-found':
      return 404;
    case 'conflict':
      return 409;
    case 'rate-limited':
      return 429;
    case 'upstream-unavailable':
      return 503;
    default:
      return assertNever(kind);
  }
};
