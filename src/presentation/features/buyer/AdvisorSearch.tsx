"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdvisorProfile } from "@core/domain/entities";
import { formatPaise } from "@core/domain/value-objects/money";
import { EVENT_NAMES } from "@core/domain/events";
import { useTrack } from "@/presentation/analytics/use-track";
import { cn } from "@/lib/utils";
import { useActiveAdvisors } from "./hooks";

/** The headline asks "which project are you evaluating?" — so project and
 *  builder must be searchable, not just the advisor's own name/city. */
function matchesQuery(a: AdvisorProfile, term: string): boolean {
  return [a.firstName, a.lastName, a.headline, a.city, a.primaryProject, a.primaryBuilder, a.primaryCity]
    .filter(Boolean)
    .some((v) => v!.toLowerCase().includes(term));
}

export function AdvisorSearch() {
  const { data, isLoading } = useActiveAdvisors();
  const track = useTrack();
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");

  const results = useMemo(() => {
    const list = data ?? [];
    if (!applied.trim()) return list;
    const term = applied.toLowerCase();
    return list.filter((a) => matchesQuery(a, term));
  }, [data, applied]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setApplied(q);
    track(EVENT_NAMES.SEARCH_PERFORMED, { actorType: "buyer" }, { query: q });
    const term = q.toLowerCase();
    const hits = (data ?? []).filter((a) => matchesQuery(a, term));
    if (q.trim() && hits.length === 0) {
      track(EVENT_NAMES.SEARCH_ZERO_RESULT, { actorType: "buyer" }, { query: q });
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-[4%] py-10">
      <div className="relative overflow-hidden rounded-[32px] bg-ink p-10">
        <div className="pointer-events-none absolute -right-[5%] -top-[30%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.13),transparent_65%)]" />
        <div className="relative max-w-xl">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            Which project are you <span className="text-amber">evaluating?</span>
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Search verified advisors who already own there.
          </p>
          <form onSubmit={onSearch} className="mt-5 flex gap-2 rounded-2xl bg-white p-1.5 shadow-sh2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search project, developer or city…"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-ink outline-none"
            />
            <button type="submit" className="rounded-xl bg-amber px-6 py-2.5 font-display text-sm font-bold text-ink">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold">
          {applied ? `Results for "${applied}"` : "Verified advisors"}
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {results.length} advisor{results.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-[22px] bg-surface-2" />)}
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <div className="rounded-[22px] border border-border bg-white p-10 text-center text-sm text-muted-foreground shadow-sh">
          No advisors match yet — we use these searches to decide where to recruit next.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((a) => <AdvisorCard key={a.advisorId} a={a} />)}
      </div>
    </div>
  );
}

function AdvisorCard({ a }: { a: AdvisorProfile }) {
  return (
    <Link
      href={`/buyer/advisor/${a.advisorId}`}
      className="group block rounded-[22px] border-[1.5px] border-border bg-white p-5 shadow-sh transition-all hover:-translate-y-0.5 hover:border-amber-2 hover:shadow-sh2"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[13px] bg-gradient-to-br from-amber to-rose font-display text-[17px] font-extrabold text-white">
          {(a.firstName[0] ?? "") + (a.lastName[0] ?? "")}
        </div>
        <div className="min-w-0">
          <div className="font-display text-[14.5px] font-bold">{a.firstName} {a.lastName}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {a.primaryProject ? `${a.primaryProject} · ${a.primaryCity ?? a.city}` : a.city}
          </div>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <span className="text-amber">★</span>
        <span className="font-semibold text-ink">{a.ratingAvg ? a.ratingAvg.toFixed(1) : "New"}</span>
        {a.ratingCount > 0 && <span>· {a.ratingCount} reviews</span>}
      </div>
      <p className="mb-4 line-clamp-2 text-[12.5px] leading-snug text-ink-2">
        {a.headline ?? a.bio ?? "Verified property owner."}
      </p>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-display text-[15px] font-extrabold">
          {formatPaise(a.ratePerMinPaise)}<span className="text-[10.5px] font-medium text-soft">/min</span>
        </span>
        <span className={cn("rounded-lg bg-amber px-4 py-2 font-display text-xs font-bold text-ink transition-colors")}>
          View →
        </span>
      </div>
    </Link>
  );
}
