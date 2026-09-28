import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { isDomainError } from '@avitus/shared';
import { ZodError } from 'zod';
import type { AvitusRequest } from './request-context';

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
      response.status(exception.getStatus()).json({
        error: { code: `HTTP.${exception.getStatus()}`, message: exception.message },
        correlationId,
      });
      return;
    }

    console.error({ correlationId, exception });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL.ERROR', message: 'Unexpected server error.' },
      correlationId,
    });
  }
}
