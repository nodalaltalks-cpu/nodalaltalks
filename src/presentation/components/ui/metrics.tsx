import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared dashboard primitives — used by the Founder Dashboard (and reusable
 *  by the advisor/buyer dashboards later). All values are passed in already
 *  derived from project(); these components never compute business logic. */

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "north" | "alert";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-[1.5px] bg-white p-5 shadow-sh",
        tone === "north" && "border-amber/40 bg-gradient-to-b from-amber-pale to-white",
        tone === "alert" && "border-rose bg-gradient-to-b from-[#FFF1F2] to-white",
        tone === "default" && "border-border",
      )}
    >
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold leading-none tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-2 text-[11.5px] font-medium text-soft">{sub}</div>}
    </div>
  );
}

export function BarList({
  data,
  limit = 6,
  fmt = (n) => String(n),
  empty = "No data yet",
}: {
  data: Record<string, number>;
  limit?: number;
  fmt?: (n: number) => string;
  empty?: string;
}) {
  const keys = Object.keys(data).sort((a, b) => (data[b] ?? 0) - (data[a] ?? 0)).slice(0, limit);
  if (keys.length === 0) {
    return <div className="py-6 text-center text-[12px] text-soft">{empty}</div>;
  }
  const max = Math.max(...keys.map((k) => data[k] ?? 0));
  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-32 flex-shrink-0 truncate text-[12px] font-semibold text-ink-2">{k}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber to-rose"
              style={{ width: `${max ? Math.round((100 * (data[k] ?? 0)) / max) : 0}%` }}
            />
          </div>
          <span className="w-12 flex-shrink-0 text-right text-[11.5px] font-bold text-muted-foreground">
            {fmt(data[k] ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Funnel({
  steps,
}: {
  steps: { label: string; value: number; meta?: string; worst?: boolean }[];
}) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 items-center rounded-lg px-3 font-display text-[12.5px] font-bold text-white",
              s.worst ? "bg-gradient-to-r from-rose to-[#EF4444]" : "bg-ink",
            )}
            style={{ width: `${Math.max(12, Math.round((100 * s.value) / top))}%` }}
          >
            {s.label} · {s.value.toLocaleString("en-IN")}
          </div>
          {s.meta && <span className="whitespace-nowrap text-[11.5px] font-semibold text-muted-foreground">{s.meta}</span>}
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-border bg-white p-6 shadow-sh">
      <h3 className="text-[15px] font-extrabold">{title}</h3>
      {subtitle && <p className="mb-4 mt-0.5 text-[11.5px] text-muted-foreground">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}
