import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes';

interface NormalizedError {
  statusCode: number;
  error: string;
  message: string | string[];
  errorCode: ErrorCode;
  errors?: unknown;
  timestamp: string;
  path: string;
}

/**
 * Single exit point for every error. Guarantees the response shape:
 *   { statusCode, error, message, errorCode, errors?, timestamp, path }
 * The legacy fields (`statusCode`, `error`, `message`) are preserved; `errors`
 * (the validation detail array) is passed through untouched.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);
    normalized.timestamp = new Date().toISOString();
    normalized.path = req.originalUrl;

    if (normalized.statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${normalized.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(normalized.statusCode).json(normalized);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'Too many requests. Please slow down and try again shortly.',
        errorCode: ErrorCode.RATE_LIMITED,
        timestamp: '',
        path: '',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let message: string | string[] = exception.message;
      let errors: unknown;
      let explicitCode: ErrorCode | undefined;

      if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (typeof b.message === 'string' || Array.isArray(b.message)) {
          message = b.message as string | string[];
        }
        if ('errors' in b) errors = b.errors;
        if (typeof b.errorCode === 'string') {
          explicitCode = b.errorCode as ErrorCode;
        }
      }

      return {
        statusCode: status,
        error: this.reasonPhrase(status),
        message,
        errorCode: explicitCode ?? this.deriveCode(status, message),
        errors,
        timestamp: '',
        path: '',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again.',
      errorCode: ErrorCode.INTERNAL,
      timestamp: '',
      path: '',
    };
  }

  private deriveCode(status: number, message: string | string[]): ErrorCode {
    const text = (Array.isArray(message) ? message.join(' ') : message).toLowerCase();

    if (status === HttpStatus.UNAUTHORIZED) {
      if (text.includes('expired')) return ErrorCode.SESSION_EXPIRED;
      if (text.includes('invalid token') || text.includes('no token')) return ErrorCode.INVALID_TOKEN;
      if (text.includes('verify your email')) return ErrorCode.EMAIL_NOT_VERIFIED;
      if (text.includes('banned')) return ErrorCode.ACCOUNT_BANNED;
      if (text.includes('credentials')) return ErrorCode.INVALID_CREDENTIALS;
      return ErrorCode.UNAUTHENTICATED;
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return text.includes('validation') ? ErrorCode.VALIDATION_ERROR : ErrorCode.BAD_REQUEST;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ErrorCode.PAYLOAD_TOO_LARGE;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return status >= 500 ? ErrorCode.INTERNAL : ErrorCode.BAD_REQUEST;
    }
  }

  private reasonPhrase(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      413: 'Payload Too Large',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return map[status] ?? 'Error';
  }
}
