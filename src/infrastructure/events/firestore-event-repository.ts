import {
  type Firestore,
  type QueryConstraint,
  type Timestamp,
  addDoc,
  collection,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query as fsQuery,
  serverTimestamp,
  where,
} from "firebase/firestore";
import type {
  EventQuery,
  EventRepository,
} from "@core/application/ports";
import type { AnalyticsEvent } from "@core/domain/events";
import { COLLECTIONS } from "../firebase/collections";

/**
 * Firestore EventRepository — the "firestore"/scale backend. Appends to the
 * append-only `analytics_events` collection (writes only; rules forbid update
 * /delete) and reads via live onSnapshot, exactly the path analytics.js
 * documented. `ts` is server-stamped; `clientTs` is kept as a fallback for
 * ordering before the server value resolves.
 */
export class FirestoreEventRepository implements EventRepository {
  constructor(private readonly db: Firestore) {}

  private get col() {
    return collection(this.db, COLLECTIONS.ANALYTICS_EVENTS);
  }

  async append(event: AnalyticsEvent): Promise<void> {
    const { ts, ...rest } = event;
    await addDoc(this.col, {
      ...rest,
      ts: serverTimestamp(),
      clientTs: ts,
    });
  }

  async query(filter?: EventQuery): Promise<AnalyticsEvent[]> {
    const snap = await getDocs(fsQuery(this.col, ...this.constraints(filter)));
    return snap.docs.map((d) => this.toEvent(d.id, d.data()));
  }

  subscribe(
    onChange: (events: AnalyticsEvent[]) => void,
    filter?: EventQuery,
  ): () => void {
    return onSnapshot(fsQuery(this.col, ...this.constraints(filter)), (snap) => {
      onChange(snap.docs.map((d) => this.toEvent(d.id, d.data())));
    });
  }

  private constraints(filter?: EventQuery): QueryConstraint[] {
    const c: QueryConstraint[] = [];
    if (filter?.since != null) c.push(where("clientTs", ">=", filter.since));
    if (filter?.until != null) c.push(where("clientTs", "<=", filter.until));
    if (filter?.actorId) c.push(where("actorId", "==", filter.actorId));
    if (filter?.names?.length) c.push(where("name", "in", filter.names.slice(0, 30)));
    c.push(orderBy("clientTs", "asc"));
    if (filter?.limit != null) c.push(fsLimit(filter.limit));
    return c;
  }

  private toEvent(id: string, data: Record<string, unknown>): AnalyticsEvent {
    const serverTs = data.ts as Timestamp | undefined;
    const ts =
      serverTs && typeof serverTs.toMillis === "function"
        ? serverTs.toMillis()
        : ((data.clientTs as number) ?? 0);
    return {
      id,
      name: data.name as AnalyticsEvent["name"],
      ts,
      actorId: data.actorId as string,
      actorType: data.actorType as AnalyticsEvent["actorType"],
      sessionId: data.sessionId as string,
      entity: (data.entity as AnalyticsEvent["entity"]) ?? {},
      props: (data.props as AnalyticsEvent["props"]) ?? {},
    };
  }
}
