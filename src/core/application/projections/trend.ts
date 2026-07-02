/**
 * Period-over-period comparison — the "is it improving?" half of the
 * founder-decision-engine principle (project() answers "what happened now";
 * this answers "vs. before"). Pure, so it's trivially testable and reusable
 * wherever a metric needs a trend, not just the Executive tab.
 */
export interface PeriodComparison {
  current: number;
  previous: number;
  /** Rounded % change. null when there's no previous-period baseline to compare against. */
  deltaPct: number | null;
}

export function comparePeriod(current: number, previous: number): PeriodComparison {
  return {
    current,
    previous,
    deltaPct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}
