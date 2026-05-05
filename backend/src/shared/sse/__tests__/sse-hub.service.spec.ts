import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { SseHubService } from '../sse-hub.service';

describe('SseHubService', () => {
  let hub: SseHubService;

  beforeEach(() => {
    hub = new SseHubService();
  });

  afterEach(() => {
    hub.onModuleDestroy();
  });

  it('delivers a published event to a subscriber', async () => {
    const collect = firstValueFrom(hub.subscribe().pipe(take(1)));
    hub.publish('idea.published', { ideaId: 'i1', cycleId: 'c1', title: 'hello' });
    const received = await collect;
    expect(received.data.event).toBe('idea.published');
    expect(received.data.payload).toEqual({ ideaId: 'i1', cycleId: 'c1', title: 'hello' });
  });

  it('filters events when subscribeTo is used', async () => {
    const collect = firstValueFrom(hub.subscribeTo('score.confirmed').pipe(take(1)));
    hub.publish('idea.published', { ideaId: 'i1', cycleId: 'c1', title: 't' });
    hub.publish('score.confirmed', { ideaId: 'i2', cycleId: 'c1' });
    const received = await collect;
    expect(received.data.event).toBe('score.confirmed');
    expect(received.data.payload).toEqual({ ideaId: 'i2', cycleId: 'c1' });
  });

  it('delivers multiple events in order', async () => {
    const collect = firstValueFrom(hub.subscribe().pipe(take(2), toArray()));
    hub.publish('cycle.opened', { cycleId: 'c1', name: 'first' });
    hub.publish('cycle.closed', { cycleId: 'c1', top3IdeaIds: ['a', 'b', 'c'] });
    const list = await collect;
    expect(list.map((m) => m.data.event)).toEqual(['cycle.opened', 'cycle.closed']);
  });
});
