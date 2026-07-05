"use client";

import { useEffect, useState } from "react";
import { project, type Metrics } from "@core/application/projections";
import { getEventRepository } from "@infra/events/event-repository.factory";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface WeeklyTrend {
  current: Metrics;
  previous: Metrics;
}

/**
 * This-week-vs-last-week comparison for the Executive tab — "is the business
 * improving?" alongside project()'s "what does it look like right now?". A
 * one-shot query (not a live subscription): a trend line doesn't need to be
 * real-time, and two extra live listeners per dashboard load isn't worth the
 * cost for a comparison that's only meaningful re-checked periodically.
 */
export function useWeeklyTrend(enabled: boolean): { trend: WeeklyTrend | null; loading: boolean } {
  const [trend, setTrend] = useState<WeeklyTrend | null>(null);

  useEffect(() => {
    // Same guard as useMetrics: the event log is staff-only readable.
    if (!enabled) return;
    let active = true;
    const now = Date.now();
    const repo = getEventRepository();

    void Promise.all([
      repo.query({ since: now - WINDOW_MS, until: now }),
      repo.query({ since: now - 2 * WINDOW_MS, until: now - WINDOW_MS }),
    ]).then(([currentEvents, previousEvents]) => {
      if (!active) return;
      setTrend({ current: project(currentEvents, now), previous: project(previousEvents, now) });
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { trend, loading: trend === null };
}
