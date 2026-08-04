import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return response.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
    }

    const err = exception as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    const message =
      err?.message ||
      (exception instanceof Error ? exception.message : 'Internal server error');

    // PostgREST missing table
    const status =
      err?.code === 'PGRST205' || message.includes('schema cache')
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    return response.status(status).json({
      statusCode: status,
      message,
      code: err?.code,
      hint:
        err?.code === 'PGRST205'
          ? 'Run supabase/schema.sql in Supabase SQL Editor, or set SUPABASE_DB_PASSWORD and run npm run db:schema'
          : err?.hint,
    });
  }
}
