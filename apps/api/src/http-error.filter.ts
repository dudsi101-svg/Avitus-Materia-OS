import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { isDomainError } from '@avitus/shared';
import { ZodError } from 'zod';
import type { AvitusRequest } from './request-context';
import { PublicIntakeLimitException } from './public-intake-budget.service';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<AvitusRequest>();
    const correlationId = request.correlationId;

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        error: { code: 'VALIDATION.ERROR', message: 'Request validation failed.', details: exception.flatten() },
        correlationId,
      });
      return;
    }

    if (isDomainError(exception)) {
      const status =
        exception.code === 'AUTH.FORBIDDEN'
          ? HttpStatus.FORBIDDEN
          : exception.code.endsWith('NOT_FOUND')
            ? HttpStatus.NOT_FOUND
            : exception.code.endsWith('_CONFLICT')
              ? HttpStatus.CONFLICT
              : HttpStatus.BAD_REQUEST;
      response.status(status).json({
        error: { code: exception.code, message: exception.message, details: exception.details },
        correlationId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      if (exception instanceof PublicIntakeLimitException) {
        response.setHeader('Retry-After', String(exception.retryAfterSeconds));
      }
      if (exception.getStatus() >= 500) {
        this.logServerFailure(correlationId, exception.getStatus());
      }
      response.status(exception.getStatus()).json({
        error: { code: `HTTP.${exception.getStatus()}`, message: exception.message },
        correlationId,
      });
      return;
    }

    this.logServerFailure(correlationId, HttpStatus.INTERNAL_SERVER_ERROR);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL.ERROR', message: 'Unexpected server error.' },
      correlationId,
    });
  }

  private logServerFailure(correlationId: string | undefined, statusCode: number): void {
    // Driver errors can include SQL parameters, customer PII and credentials in
    // message/detail/cause/stack. Use an allowlist, never serialize the exception.
    console.error(JSON.stringify({
      level: 'error',
      event: 'http.server_error',
      timestamp: new Date().toISOString(),
      correlationId,
      statusCode,
    }));
  }
}
