"use client";

import type { AdvisorProfile } from "@core/domain/entities";
import { cn } from "@/lib/utils";
import { useVerificationQueue } from "./hooks";

/** SLA aging — proptech ops treat >48h pending as a breach to action. */
function ageBadge(submittedAt?: number) {
  if (!submittedAt) return { label: "—", cls: "bg-surface-2 text-muted-foreground" };
  const hrs = Math.round((Date.now() - submittedAt) / 3.6e6);
  const label = hrs < 1 ? "<1h" : `${hrs}h`;
  if (hrs >= 48) return { label, cls: "bg-[#FFF1F2] text-[#9F1239]" };
  if (hrs >= 24) return { label, cls: "bg-amber-pale text-[#92400E]" };
  return { label, cls: "bg-[#DCFCE7] text-[#065F46]" };
}

export function VerificationQueue({
  onOpen,
}: {
  onOpen: (advisorId: string) => void;
}) {
  const { data, isLoading, isError, error } = useVerificationQueue();

  return (
    <div>
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal/30 bg-[#EFF6FF] px-3.5 py-1.5 text-[11.5px] font-bold text-[#075985]">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" /> YOUR WORK QUEUE · OLDEST FIRST
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Verification Queue</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted-foreground">
          Confirm each advisor truly owns the property they claim. Work top-down —
          red badges have waited past the 48h SLA. Open an advisor to review and
          decide each document.
        </p>
      </div>

      {isLoading && <SkeletonRows />}
      {isError && (
        <p className="text-[13px] font-semibold text-rose">
          Couldn&apos;t load the queue: {(error as Error)?.message}
        </p>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-10 text-center text-sm text-muted-foreground shadow-sh">
          🎉 Queue is clear — no applications waiting.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-white shadow-sh">
          <div className="grid grid-cols-[1.4fr_1.2fr_0.7fr_0.8fr_0.6fr] gap-3 border-b border-border px-5 py-3 text-[10.5px] font-bold uppercase tracking-wide text-soft">
            <span>Advisor</span><span>Claimed property</span><span>Waiting</span><span>Status</span><span />
          </div>
          {data.map((a) => (
            <QueueRow key={a.advisorId} a={a} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({
  a,
  onOpen,
}: {
  a: AdvisorProfile;
  onOpen: (id: string) => void;
}) {
  const age = ageBadge(a.submittedAt);
  return (
    <button
      onClick={() => onOpen(a.advisorId)}
      className="grid w-full grid-cols-[1.4fr_1.2fr_0.7fr_0.8fr_0.6fr] items-center gap-3 border-t border-border px-5 py-4 text-left transition-colors hover:bg-surface"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-amber to-rose text-[13px] font-bold text-white">
          {(a.firstName[0] ?? "?") + (a.lastName[0] ?? "")}
        </div>
        <div>
          <div className="text-[13.5px] font-bold">{a.firstName} {a.lastName}</div>
          <div className="text-[11px] text-soft">{a.city}</div>
        </div>
      </div>
      <div className="text-[12.5px] font-semibold text-ink-2">{a.headline ?? "—"}</div>
      <div>
        <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-bold", age.cls)}>
          {age.label}
        </span>
      </div>
      <div>
        <span className="inline-block rounded-full bg-amber-pale px-2.5 py-1 text-[11px] font-bold text-[#92400E]">
          {a.status === "submitted" ? "🆕 New" : "👀 In-Review"}
        </span>
      </div>
      <div className="text-right">
        <span className="rounded-lg bg-ink px-3.5 py-2 font-display text-xs font-bold text-white">
          Review
        </span>
      </div>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}
