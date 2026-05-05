// SSE event taxonomy — mirrors functional-design Q11 (NFR design § FE rendering).
// Events are namespaced by domain; payloads are intentionally lightweight (IDs +
// minimal context). Consumers re-fetch via REST when richer data is needed.

export interface SseEventMap {
  'idea.published': { ideaId: string; cycleId: string; title: string };
  'idea.deleted': { ideaId: string; cycleId: string };
  'score.confirmed': { ideaId: string; cycleId: string };
  'cycle.opened': { cycleId: string; name: string };
  'cycle.closed': { cycleId: string; top3IdeaIds: string[] };
  'leaderboard.updated': { cycleId: string };
  ping: { ts: number };
}

export type SseEventName = keyof SseEventMap;

export interface SsePayload<E extends SseEventName = SseEventName> {
  event: E;
  data: SseEventMap[E];
}
