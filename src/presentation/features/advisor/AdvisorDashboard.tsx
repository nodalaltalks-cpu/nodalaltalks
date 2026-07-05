"use client";

import Link from "next/link";
import type { AdvisorStatus, Call } from "@core/domain/entities";
import { formatPaise } from "@core/domain/value-objects/money";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useAdvisorCalls, useAdvisorEarnings, useOwnAdvisorProfile } from "./hooks";

/**
 * The advisor's home — the "advisor mode" of a buyer account (advisor is a
 * capability, not a separate identity; see auth-provider.tsx). M6 ships the
 * shell + verification status card; earnings/calls (M7) and the availability
 * toggle (M8) slot in below.
 */
const STATUS_COPY: Record<AdvisorStatus, { badge: string; cls: string; title: string; body: string }> = {
  draft: {
    badge: "📝 Draft",
    cls: "bg-surface-2 text-muted-foreground",
    title: "Your application isn't submitted yet",
    body: "Finish the onboarding form to send your application for verification.",
  },
  submitted: {
    badge: "📨 Submitted",
    cls: "bg-[#EFF6FF] text-[#075985]",
    title: "Application received",
    body: "Our team verifies ownership documents by hand — usually within 48 hours. You'll see the result here.",
  },
  under_review: {
    badge: "👀 Under review",
    cls: "bg-amber-pale text-[#92400E]",
    title: "A verifier is reviewing your documents",
    body: "No action needed from you right now. If anything needs a re-upload, it will appear here.",
  },
  active: {
    badge: "✅ Live",
    cls: "bg-[#DCFCE7] text-[#065F46]",
    title: "You're live — buyers can find you",
    body: "Your profile appears in search for your project. Keep your availability up to date.",
  },
  rejected: {
    badge: "✕ Rejected",
    cls: "bg-[#FFF1F2] text-[#9F1239]",
    title: "This application was rejected",
    body: "See the reason below. You can contact support if you believe this is a mistake.",
  },
  suspended: {
    badge: "⏸ Suspended",
    cls: "bg-[#F3F4F6] text-[#6B7280]",
    title: "Your advisor profile is suspended",
    body: "Contact support for details on reinstating your profile.",
  },
};

export function AdvisorDashboard() {
  const { user, loading, capabilities } = useAuth();
  const { data: profile } = useOwnAdvisorProfile();
  const isActive = capabilities.advisorStatus === "active";
  const { data: earnings } = useAdvisorEarnings(isActive);
  const { data: calls } = useAdvisorCalls(isActive);

  if (loading || (user && !capabilities.resolved)) {
    return <Center><div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-surface-2" /></Center>;
  }

  if (!user) {
    return (
      <Center>
        <h1 className="text-xl font-extrabold">Sign in to view your advisor dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Advisors sign in with the same phone number they applied with.
        </p>
        <Link href="/buyer/signup" className="mt-4 inline-block rounded-[11px] bg-amber px-6 py-3 font-display text-[13.5px] font-extrabold text-ink">
          Sign in →
        </Link>
      </Center>
    );
  }

  if (!capabilities.advisorStatus) {
    return (
      <Center>
        <h1 className="text-xl font-extrabold">You&apos;re not an advisor yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Own a property? Turn your experience into income — get verified and
          take paid calls from buyers evaluating your project.
        </p>
        <Link href="/advisor/onboarding" className="mt-4 inline-block rounded-[11px] bg-amber px-6 py-3 font-display text-[13.5px] font-extrabold text-ink">
          Become an advisor →
        </Link>
      </Center>
    );
  }

  const status = STATUS_COPY[capabilities.advisorStatus];

  return (
    <div className="mx-auto max-w-3xl px-[4%] py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Advisor Dashboard</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Your verification status, calls and earnings.
          </p>
        </div>
        <Link
          href="/buyer"
          className="flex-shrink-0 rounded-[10px] border-[1.5px] border-[color:var(--border-2)] px-4 py-2.5 text-[12.5px] font-bold text-muted-foreground hover:border-ink hover:text-ink"
        >
          ⇄ Switch to buyer mode
        </Link>
      </div>

      {/* status card */}
      <div className="rounded-2xl border-[1.5px] border-border bg-white p-6 shadow-sh">
        <span className={`inline-block rounded-full px-3 py-1.5 text-[11px] font-bold ${status.cls}`}>
          {status.badge}
        </span>
        <h2 className="mt-3 text-lg font-extrabold">{status.title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{status.body}</p>
        {capabilities.advisorStatus === "rejected" && profile?.rejectionReason && (
          <p className="mt-3 rounded-lg bg-[#FFF1F2] px-3 py-2 text-[12.5px] font-semibold text-[#9F1239]">
            Reason: {profile.rejectionReason}
          </p>
        )}
        {capabilities.advisorStatus === "active" && profile && (
          <p className="mt-3 text-[12px] text-soft">
            Your rate: <b className="text-ink">₹{Math.round(profile.ratePerMinPaise / 100)}/min</b>
            {profile.primaryProject ? <> · {profile.primaryProject}</> : null}
          </p>
        )}
      </div>

      {isActive && (
        <>
          {/* earnings */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-[1.5px] border-border bg-white p-6 shadow-sh">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">This week</div>
              <div className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                {formatPaise(earnings?.thisWeekPaise ?? 0)}
              </div>
            </div>
            <div className="rounded-2xl border-[1.5px] border-border bg-white p-6 shadow-sh">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Lifetime earnings</div>
              <div className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                {formatPaise(earnings?.lifetimePaise ?? 0)}
              </div>
              <div className="mt-1 text-[11px] text-soft">Payouts transfer weekly to your bank.</div>
            </div>
          </div>

          {/* call history */}
          <div className="mt-5 rounded-2xl border-[1.5px] border-border bg-white p-5 shadow-sh">
            <h3 className="mb-3 text-[15px] font-extrabold">Recent calls</h3>
            {(calls?.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-soft">
                No calls yet — you&apos;ll see each consultation here the moment it ends.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {calls!.map((c) => <AdvisorCallRow key={c.id} c={c} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AdvisorCallRow({ c }: { c: Call }) {
  const done = c.status === "completed";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-base ${done ? "bg-[#DCFCE7]" : "bg-surface-2"}`}>
        {done ? "📞" : "…"}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold capitalize">{c.status}</div>
        <div className="text-[11px] text-soft">
          {new Date(c.requestedAt).toLocaleString("en-IN")}
          {c.durationSec ? ` · ${Math.round(c.durationSec / 60)} min` : ""}
        </div>
      </div>
      {done && c.advisorPayoutPaise != null && (
        <div className="ml-auto font-display text-[13.5px] font-bold text-green">
          +{formatPaise(c.advisorPayoutPaise)}
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-[4%] py-24 text-center text-muted-foreground">{children}</div>;
}
