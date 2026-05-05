import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error, code } = this.mapException(exception);

    const body: ErrorResponseDto = {
      statusCode: status,
      error,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { err: exception, path: body.path, code },
        `Unhandled error: ${typeof message === 'string' ? message : message.join('; ')}`,
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn({ status, path: body.path, code }, 'Client error');
    }

    response.status(status).json(body);
  }

  private mapException(exception: unknown): {
    status: number;
    error: string;
    message: string | string[];
    code?: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message);
      const error =
        typeof res === 'object' && res !== null && 'error' in res
          ? String((res as { error: string }).error)
          : exception.name;
      const code =
        typeof res === 'object' && res !== null && 'code' in res
          ? String((res as { code: string }).code)
          : undefined;
      return { status, error, message, code };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaKnown(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid data shape for database operation',
        code: 'PRISMA_VALIDATION',
      };
    }

    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: exception.message,
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Unknown error',
      code: 'UNKNOWN',
    };
  }

  private mapPrismaKnown(err: Prisma.PrismaClientKnownRequestError): {
    status: number;
    error: string;
    message: string;
    code: string;
  } {
    switch (err.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Resource already exists (unique constraint violation)',
          code: 'UNIQUE_VIOLATION',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Resource not found',
          code: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Foreign key constraint violation',
          code: 'FOREIGN_KEY_VIOLATION',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: `Database error (${err.code})`,
          code: `PRISMA_${err.code}`,
        };
    }
  }
}
