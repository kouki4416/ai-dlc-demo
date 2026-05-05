import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable, tap } from 'rxjs';

// Lightweight request-end logger; redact paths defined in LoggerModule do the heavy lifting.
@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext('LoggerInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      originalUrl?: string;
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.debug(
            { method: req.method, path: req.originalUrl ?? req.url, ip: req.ip },
            'request handled',
          );
        },
      }),
    );
  }
}
