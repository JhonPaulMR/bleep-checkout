import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';

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
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapeado = this.mapearErroPrisma(exception);
      if (mapeado) {
        statusCode = mapeado.statusCode;
        error = mapeado.error;
        message = mapeado.message;
        this.logger.warn(
          `${request.method} ${request.url} - Prisma ${exception.code}: ${exception.message}`,
        );
      } else {
        this.logger.error(`${request.method} ${request.url}`, exception.stack);
      }
    } else {
      this.logger.error(
        `${request.method} ${request.url}`,
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

  private mapearErroPrisma(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { statusCode: number; error: string; message: string } | null {
    if (exception.code === 'P2002') {
      const target = exception.meta?.target;
      const campos = Array.isArray(target)
        ? target.map(String).join(', ')
        : typeof target === 'string'
          ? target
          : '';
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: campos
          ? `Já existe um registro com este valor de ${campos}.`
          : 'Já existe um registro com estes dados.',
      };
    }
    if (exception.code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Registro não encontrado.',
      };
    }
    return null;
  }
}
