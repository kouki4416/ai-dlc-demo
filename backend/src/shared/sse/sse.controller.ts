import { Controller, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable, interval, merge, map } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SseHubService } from './sse-hub.service';

const HEARTBEAT_INTERVAL_MS = 25_000;

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'events', version: '1' })
export class SseController {
  constructor(private readonly hub: SseHubService) {}

  @Sse()
  stream(): Observable<{ data: unknown }> {
    const heartbeat = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({ data: { event: 'ping', payload: { ts: Date.now() } } })),
    );
    return merge(this.hub.subscribe(), heartbeat);
  }
}
