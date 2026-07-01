"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EVENT_NAMES } from "@core/domain/events";
import { formatPaise } from "@core/domain/value-objects/money";
import { useTrack } from "@/presentation/analytics/use-track";
import { useRequestCall } from "@/presentation/features/calls/hooks";
import { Button } from "@/presentation/components/ui/button";
import { useAdvisorProfile } from "./hooks";

export function AdvisorProfileView({ advisorId }: { advisorId: string }) {
  const { data, isLoading } = useAdvisorProfile(advisorId);
  const track = useTrack();
  const router = useRouter();
  const requestCall = useRequestCall();
  const viewed = useRef(false);
  const [shortlisted, setShortlisted] = useState(false);

  // Fire advisor_profile_view exactly once, after the profile resolves.
  useEffect(() => {
    if (data?.profile && !viewed.current) {
      viewed.current = true;
      track(
        EVENT_NAMES.ADVISOR_PROFILE_VIEW,
        { advisorId, projectId: data.property?.project },
        { source: "search" },
      );
    }
  }, [data, advisorId, track]);

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-[4%] py-16"><div className="h-64 animate-pulse rounded-[22px] bg-surface-2" /></div>;
  }
  if (!data?.profile) {
    return (
      <div className="mx-auto max-w-3xl px-[4%] py-24 text-center text-muted-foreground">
        This advisor isn&apos;t available. <Link href="/buyer" className="font-semibold text-amber">Browse others →</Link>
      </div>
    );
  }

  const { profile, property } = data;

  const shortlist = () => {
    if (shortlisted) return;
    setShortlisted(true);
    track(EVENT_NAMES.ADVISOR_SHORTLISTED, { advisorId, projectId: property?.project });
  };

  const talkNow = () => {
    requestCall.mutate(advisorId, {
      onSuccess: ({ call }) => router.push(`/buyer/call/${call.id}`),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-[4%] py-10">
      <Link href="/buyer" className="mb-4 inline-block text-[13px] font-bold text-muted-foreground hover:text-ink">← Back to search</Link>

      <div className="rounded-[32px] border-[1.5px] border-border bg-white p-8 shadow-sh">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber to-rose text-2xl font-extrabold text-white">
            {(profile.firstName[0] ?? "") + (profile.lastName[0] ?? "")}
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              {profile.firstName} {profile.lastName}
              {profile.ownershipVerified && (
                <span className="rounded-full bg-[rgba(16,185,129,.08)] px-2 py-0.5 text-[10px] font-bold text-green">✓ Verified owner</span>
              )}
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {property ? `${property.project} · ${property.builder} · ${property.city}` : profile.city}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="text-amber">★</span>
              <b className="text-ink">{profile.ratingAvg ? profile.ratingAvg.toFixed(1) : "New"}</b>
              {profile.ratingCount > 0 && <span>· {profile.ratingCount} reviews</span>}
            </div>
          </div>
        </div>

        {profile.bio && <p className="mt-5 text-sm leading-relaxed text-ink-2">{profile.bio}</p>}

        {property?.expertise?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {property.expertise.map((t) => (
              <span key={t} className="rounded-full border border-amber/20 bg-[rgba(245,158,11,.09)] px-3 py-1 text-[11.5px] font-semibold text-[#92400E]">{t}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-[22px] border-[1.5px] border-border bg-ink p-6 text-white shadow-sh">
        <div className="font-display text-3xl font-extrabold text-amber-2">
          {formatPaise(profile.ratePerMinPaise)}<span className="text-[13px] font-medium text-white/40">/min</span>
        </div>
        <p className="mt-1 text-[12.5px] text-white/45">Pay only for the minutes you talk. No broker, no spam.</p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            className="w-full bg-amber text-ink hover:bg-amber-2"
            disabled={requestCall.isPending}
            onClick={talkNow}
          >
            {requestCall.isPending ? "Connecting…" : "📞 Talk Now"}
          </Button>
          <button
            onClick={shortlist}
            className="w-full rounded-[11px] border-[1.5px] border-white/15 bg-white/[.08] py-3 font-display text-[13.5px] font-bold text-white"
          >
            {shortlisted ? "★ Shortlisted" : "☆ Shortlist advisor"}
          </button>
        </div>
        {requestCall.isError && (
          <p className="mt-3 text-center text-[11.5px] font-medium text-rose">
            {requestCall.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
