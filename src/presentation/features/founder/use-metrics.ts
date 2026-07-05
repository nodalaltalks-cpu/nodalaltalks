"use client";

import { useEffect, useState } from "react";
import { project, type Metrics } from "@core/application/projections";
import { getEventRepository } from "@infra/events/event-repository.factory";

/**
 * Live founder metrics. Subscribes to the append-only event log and recomputes
 * with the SAME project() reducer used everywhere else — so every tile is
 * derived from events, never stored. With the Firestore backend this is a real
 * onSnapshot; with the in-memory backend it updates on every track().
 *
 * This is exactly the analytics.js promise: swap the backend, the dashboard
 * code never changes.
 */
export function useMetrics(enabled: boolean): { metrics: Metrics | null; loading: boolean } {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    // Never open a listener for an unauthorized visitor — Security Rules would
    // reject it (staff-only read) and spam uncaught permission-denied errors.
    if (!enabled) return;
    const repo = getEventRepository();
    if (repo.subscribe) {
      return repo.subscribe((events) => setMetrics(project(events)));
    }
    let active = true;
    void repo.query().then((events) => {
      if (active) setMetrics(project(events));
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { metrics, loading: metrics === null };
}
