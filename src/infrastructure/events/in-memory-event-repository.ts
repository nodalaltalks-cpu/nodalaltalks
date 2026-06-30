import type {
  EventQuery,
  EventRepository,
} from "@core/application/ports";
import type { AnalyticsEvent } from "@core/domain/events";

/**
 * In-memory EventRepository for the "local" backend and unit tests. Mirrors the
 * MVP localStorage path in analytics.js without a browser dependency. Append is
 * synchronous truth; subscribers are notified on every append.
 */
export class InMemoryEventRepository implements EventRepository {
  private events: AnalyticsEvent[] = [];
  private listeners = new Set<(events: AnalyticsEvent[]) => void>();

  constructor(seed: AnalyticsEvent[] = []) {
    this.events = [...seed];
  }

  async append(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
    this.emit();
  }

  async query(filter?: EventQuery): Promise<AnalyticsEvent[]> {
    return this.applyFilter(this.events, filter);
  }

  subscribe(
    onChange: (events: AnalyticsEvent[]) => void,
    filter?: EventQuery,
  ): () => void {
    const wrapped = () => onChange(this.applyFilter(this.events, filter));
    this.listeners.add(wrapped);
    wrapped(); // emit current state immediately
    return () => {
      this.listeners.delete(wrapped);
    };
  }

  private emit(): void {
    this.listeners.forEach((l) => l(this.applyFilter(this.events, undefined)));
  }

  private applyFilter(
    events: AnalyticsEvent[],
    filter?: EventQuery,
  ): AnalyticsEvent[] {
    let out = events;
    if (filter) {
      if (filter.since != null) out = out.filter((e) => e.ts >= filter.since!);
      if (filter.until != null) out = out.filter((e) => e.ts <= filter.until!);
      if (filter.actorId) out = out.filter((e) => e.actorId === filter.actorId);
      if (filter.names?.length) {
        const set = new Set(filter.names);
        out = out.filter((e) => set.has(e.name));
      }
    }
    out = [...out].sort((a, b) => a.ts - b.ts);
    if (filter?.limit != null) out = out.slice(-filter.limit);
    return out;
  }
}
