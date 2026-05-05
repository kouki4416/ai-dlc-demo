import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<{ method: string; originalUrl?: string; url: string }>();
    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        next: () => this.log(req, start, 'ok'),
        error: () => this.log(req, start, 'err'),
      }),
    );
  }

  private log(
    req: { method: string; originalUrl?: string; url: string },
    start: bigint,
    outcome: 'ok' | 'err',
  ): void {
    const elapsedNs = process.hrtime.bigint() - start;
    const elapsedMs = Number(elapsedNs) / 1_000_000;
    this.logger.log(
      `${req.method} ${req.originalUrl ?? req.url} (${outcome}) — ${elapsedMs.toFixed(2)}ms`,
    );
  }
}
