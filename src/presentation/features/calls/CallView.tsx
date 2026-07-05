"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise, callCharge } from "@core/domain/value-objects/money";
import { EXPERTISE } from "@/presentation/features/advisor-onboarding/options";
import { useAdvisorProfile } from "@/presentation/features/buyer/hooks";
import { useReviewForCall, useSubmitReview } from "@/presentation/features/reviews/hooks";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/lib/utils";
import { useCall, useEndCall } from "./hooks";

/** Live in-call screen. Placeholder provider today — same UI keeps working once
 *  Agora/Twilio actually carry audio, since it only depends on the call doc. */
export function CallView({ callId }: { callId: string }) {
  const { data: call, isLoading } = useCall(callId);
  const { data: advisorData } = useAdvisorProfile(call?.advisorId ?? "");
  const endCall = useEndCall();
  const router = useRouter();
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (call?.status !== "started" || !call.startedAt) return;
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - call.startedAt!) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [call?.status, call?.startedAt]);

  if (isLoading) {
    return <Center><div className="h-40 w-full max-w-sm animate-pulse rounded-[22px] bg-surface-2" /></Center>;
  }
  if (!call) {
    return <Center><p className="font-semibold text-muted-foreground">Call not found.</p></Center>;
  }

  const advisor = advisorData?.profile;
  const runningCostPaise = callCharge(call.ratePerMinPaise, elapsedSec);
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const secs = String(elapsedSec % 60).padStart(2, "0");

  if (call.status === "completed") {
    return (
      <Center>
        <div className="w-full max-w-sm rounded-[22px] border-[1.5px] border-border bg-white p-7 text-center shadow-sh">
          <div className="text-3xl">✅</div>
          <h1 className="mt-3 text-lg font-extrabold">Call ended</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {Math.floor((call.durationSec ?? 0) / 60)}m {(call.durationSec ?? 0) % 60}s ·{" "}
            {formatPaise(call.amountChargedPaise ?? 0)} charged
          </p>
          <p className="mt-3 text-[11px] text-soft">🔔 A receipt was sent to your notifications.</p>
          <ReviewPrompt callId={callId} />
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => router.push("/buyer/wallet")}
          >
            View wallet
          </Button>
        </div>
      </Center>
    );
  }

  if (call.status !== "started") {
    return <Center><p className="font-semibold text-muted-foreground">This call has ended.</p></Center>;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-[4%] py-10 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber to-rose text-3xl font-extrabold text-white">
        {advisor ? (advisor.firstName[0] ?? "") + (advisor.lastName[0] ?? "") : "…"}
      </div>
      <h1 className="mt-4 text-xl font-extrabold">
        {advisor ? `${advisor.firstName} ${advisor.lastName}` : "Connecting…"}
      </h1>
      <p className="mt-1 text-[13px] text-muted-foreground">{formatPaise(call.ratePerMinPaise)}/min</p>

      <div className="mt-4 flex gap-2 rounded-[10px] border border-amber/40 bg-amber-pale px-3 py-2 text-[11px] font-semibold leading-snug text-[#92400E]">
        <span>🧪</span>
        <span>Beta: this is a simulated call — no audio is carried yet. Billing and receipts are real (test credits).</span>
      </div>

      <div className="mt-6 font-display text-5xl font-extrabold tabular-nums tracking-tight">
        {mins}:{secs}
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        {formatPaise(runningCostPaise, { decimals: true })} so far
      </p>

      {endCall.isError && (
        <p className="mt-3 text-[11.5px] font-medium text-rose">{endCall.error.message}</p>
      )}

      <button
        disabled={endCall.isPending}
        onClick={() => endCall.mutate({ callId, reason: "buyer_hangup" })}
        className="mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-rose text-2xl text-white shadow-sh transition-all hover:opacity-90 disabled:opacity-50"
        aria-label="Hang up"
      >
        {endCall.isPending ? "…" : "☎"}
      </button>
      <p className="mt-3 text-[11px] text-muted-foreground">Tap to hang up</p>
    </div>
  );
}

const CONFIDENCE_OPTIONS = [
  { value: "more", label: "More confident" },
  { value: "same", label: "About the same" },
  { value: "less", label: "Less confident" },
] as const;

/** Shown once, right after a call ends. Reuses the advisor-onboarding expertise
 *  taxonomy for concern tags, so buyer demand and advisor supply speak the same
 *  language for future matching/intelligence (no separate list to maintain). */
function ReviewPrompt({ callId }: { callId: string }) {
  const { data: existing, isLoading } = useReviewForCall(callId);
  const submit = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [confidenceShift, setConfidenceShift] = useState<"more" | "same" | "less" | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  if (isLoading) return null;

  if (existing || submit.isSuccess) {
    return (
      <p className="mt-4 rounded-[10px] bg-[rgba(16,185,129,.08)] py-2.5 text-[12.5px] font-semibold text-green">
        ✓ Thanks for rating this call
      </p>
    );
  }

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <div className="mt-5 border-t border-border pt-5 text-left">
      <p className="mb-2 text-center text-[13px] font-bold">How was the call?</p>
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={cn("text-2xl transition-transform hover:scale-110", n <= rating ? "text-amber" : "text-border")}
          >
            ★
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <div className="mt-4 flex justify-center gap-1.5">
            {CONFIDENCE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setConfidenceShift(o.value)}
                className={cn(
                  "rounded-full border-[1.5px] px-2.5 py-1 text-[10.5px] font-semibold",
                  confidenceShift === o.value
                    ? "border-amber bg-amber-pale text-[#92400E]"
                    : "border-[color:var(--border-2)] text-soft",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {EXPERTISE.slice(0, 6).map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10.5px] font-medium",
                  tags.includes(t)
                    ? "border-amber/40 bg-[rgba(245,158,11,.09)] text-[#92400E]"
                    : "border-[color:var(--border-2)] text-soft",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything else worth sharing? (optional)"
            rows={2}
            className="mt-3 w-full rounded-[10px] border-[1.5px] border-[color:var(--border-2)] px-3 py-2 text-[12.5px] outline-none focus:border-amber"
          />

          {submit.isError && (
            <p className="mt-2 text-[11.5px] font-medium text-rose">{submit.error.message}</p>
          )}

          <Button
            size="block"
            className="mt-3 bg-amber text-ink hover:bg-amber-2"
            disabled={submit.isPending}
            onClick={() =>
              submit.mutate({
                callId,
                rating,
                confidenceShift,
                concernTags: tags,
                comment: comment.trim() || undefined,
              })
            }
          >
            {submit.isPending ? "Submitting…" : "Submit rating"}
          </Button>
        </>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-[4%] py-24">{children}</div>;
}
