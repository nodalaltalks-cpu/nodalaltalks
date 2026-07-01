"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise, callCharge } from "@core/domain/value-objects/money";
import { useAdvisorProfile } from "@/presentation/features/buyer/hooks";
import { Button } from "@/presentation/components/ui/button";
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
          <Button className="mt-5 w-full bg-amber text-ink hover:bg-amber-2" onClick={() => router.push("/buyer/wallet")}>
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

      <div className="mt-8 font-display text-5xl font-extrabold tabular-nums tracking-tight">
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

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-[4%] py-24">{children}</div>;
}
