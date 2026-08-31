import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Helpers that attach a stable `errorCode` to the exception body so the
 * AllExceptionsFilter forwards it verbatim to clients.
 */
export const AppError = {
  badRequest: (message: string, errorCode: ErrorCode = ErrorCode.BAD_REQUEST) =>
    new BadRequestException({ message, errorCode }),

  forbidden: (message: string, errorCode: ErrorCode = ErrorCode.FORBIDDEN) =>
    new ForbiddenException({ message, errorCode }),

  notFound: (message: string, errorCode: ErrorCode = ErrorCode.NOT_FOUND) =>
    new NotFoundException({ message, errorCode }),

  conflict: (message: string, errorCode: ErrorCode = ErrorCode.CONFLICT) =>
    new ConflictException({ message, errorCode }),
};
