import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import type { SseEventMap, SseEventName, SsePayload } from './sse-event.types';

/**
 * In-memory pub/sub for the application-wide SSE hub. Single-process design
 * (NFR Q1=A — in-memory). Horizontal scaling out is explicitly out of scope.
 */
@Injectable()
export class SseHubService implements OnModuleDestroy {
  private readonly logger = new Logger(SseHubService.name);
  private readonly subject = new Subject<SsePayload>();

  publish<E extends SseEventName>(event: E, data: SseEventMap[E]): void {
    this.subject.next({ event, data } as SsePayload);
  }

  subscribe(): Observable<{ data: { event: SseEventName; payload: unknown } }> {
    return this.subject.asObservable().pipe(
      map((p) => ({ data: { event: p.event, payload: p.data } })),
    );
  }

  subscribeTo<E extends SseEventName>(
    event: E,
  ): Observable<{ data: { event: E; payload: SseEventMap[E] } }> {
    return this.subject.asObservable().pipe(
      filter((p): p is SsePayload<E> => p.event === event),
      map((p) => ({ data: { event, payload: p.data } })),
    );
  }

  onModuleDestroy(): void {
    this.subject.complete();
    this.logger.log('SSE hub closed');
  }
}
