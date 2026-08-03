import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, string[]>;
}

/** Normalizes every thrown error into { success: false, error: { code, message, details? } }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = { code: 'INTERNAL_ERROR', message: 'Something went wrong' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        body = { code: 'ERROR', message: response };
      } else {
        const r = response as ErrorBody & { message?: string | string[] };
        body = {
          code: r.code ?? 'ERROR',
          message: Array.isArray(r.message) ? r.message.join(', ') : r.message ?? exception.message,
          details: r.details,
        };
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    res.status(status).json({ success: false, error: body });
  }
}
