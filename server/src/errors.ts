import type { ApiErrorCode } from '@learning-companion/shared';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: ApiErrorCode, message: string) {
    super(message);
  }
}
