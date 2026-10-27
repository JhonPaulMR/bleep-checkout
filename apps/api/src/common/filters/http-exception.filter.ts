import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Erro interno do servidor.';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = HttpStatus[statusCode] ?? exception.name;
      } else {
        const parsed = body as { message?: string | string[]; error?: string };
        message = parsed.message ?? exception.message;
        error = parsed.error ?? exception.name;
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
