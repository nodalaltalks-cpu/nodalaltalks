import "server-only";
import { FieldValue, type Query, type Timestamp } from "firebase-admin/firestore";
import type { EventQuery, EventRepository } from "@core/application/ports";
import type { AnalyticsEvent } from "@core/domain/events";
import { getFirebaseAdmin } from "../firebase/admin";
import { COLLECTIONS } from "../firebase/collections";

/**
 * Admin-SDK EventRepository for appending events from server routes / Cloud
 * Functions (e.g. wallet_recharged after a server-verified payment). Append-only,
 * same `analytics_events` shape the client writes, so the log stays uniform.
 */
export class AdminEventRepository implements EventRepository {
  private readonly db = getFirebaseAdmin().db;

  async append(event: AnalyticsEvent): Promise<void> {
    const { ts, ...rest } = event;
    await this.db.collection(COLLECTIONS.ANALYTICS_EVENTS).add({
      ...rest,
      ts: FieldValue.serverTimestamp(),
      clientTs: ts,
    });
  }

  async query(filter?: EventQuery): Promise<AnalyticsEvent[]> {
    let q: Query = this.db
      .collection(COLLECTIONS.ANALYTICS_EVENTS)
      .orderBy("clientTs", "asc");
    if (filter?.actorId) q = q.where("actorId", "==", filter.actorId);
    if (filter?.limit != null) q = q.limit(filter.limit);
    const snap = await q.get();
    return snap.docs.map((d) => {
      const data = d.data();
      const serverTs = data.ts as Timestamp | undefined;
      const tsMs =
        serverTs && typeof serverTs.toMillis === "function"
          ? serverTs.toMillis()
          : ((data.clientTs as number) ?? 0);
      return {
        id: d.id,
        name: data.name,
        ts: tsMs,
        actorId: data.actorId,
        actorType: data.actorType,
        sessionId: data.sessionId,
        entity: data.entity ?? {},
        props: data.props ?? {},
        // Pre-versioning events predate these fields; default to the v1 envelope.
        eventVersion: data.eventVersion ?? 1,
        schemaVersion: data.schemaVersion ?? 1,
        source: data.source ?? "unknown",
        platform: data.platform ?? "web",
        environment: data.environment ?? "production",
      } as AnalyticsEvent;
    });
  }
}
