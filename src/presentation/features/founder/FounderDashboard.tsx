"use client";

import { useState } from "react";
import { isAdminRole } from "@core/domain/value-objects/role";
import type { Metrics } from "@core/application/projections";
import { useAuth } from "@/presentation/providers/auth-provider";
import { BarList, Funnel, Panel, StatTile } from "@/presentation/components/ui/metrics";
import { cn } from "@/lib/utils";
import { useMetrics } from "./use-metrics";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const TABS = ["Executive", "Marketplace", "Growth", "Buyers", "Revenue", "Trust"] as const;
type Tab = (typeof TABS)[number];

export function FounderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { metrics, loading } = useMetrics();
  const [tab, setTab] = useState<Tab>("Executive");

  if (authLoading) {
    return <Center>Loading…</Center>;
  }
  if (!user || !isAdminRole(user.role)) {
    return (
      <Center>
        <h1 className="text-xl font-extrabold">Founder access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This cockpit is restricted to founders and admins.
        </p>
      </Center>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-[4%] py-10">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber-pale px-3.5 py-1.5 text-[11.5px] font-bold text-[#92400E]">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          LIVE · EVERY NUMBER DERIVED FROM EVENTS
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Founder Cockpit</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Computed in real time from the append-only event log — zero hardcoded
          values. As advisors onboard, get verified, and buyers sign up, these
          update automatically.
        </p>
      </div>

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-[12.5px] font-bold transition-all",
              tab === t ? "bg-white text-ink shadow-sh" : "text-muted-foreground hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading || !metrics ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      ) : (
        <Sections tab={tab} m={metrics} />
      )}
    </div>
  );
}

function Sections({ tab, m }: { tab: Tab; m: Metrics }) {
  if (tab === "Executive") {
    return (
      <div className="space-y-4">
        <Grid>
          <StatTile tone="north" label="⭐ Trusted Consultation Min" value={m.tcm.toLocaleString("en-IN")} sub="North Star · completed & rated ≥4" />
          <StatTile tone={m.matchRate < 60 ? "alert" : "default"} label="Call Match Rate" value={`${m.matchRate}%`} sub="requested → completed" />
          <StatTile label="Net Revenue" value={inr(m.netRevenue)} sub="charged − advisor payout" />
          <StatTile label="NDT Trust Index" value={m.ndtTrustIndex} sub="composite 0–100" />
        </Grid>
        <Grid>
          <StatTile label="Active Buyers" value={m.activeBuyers.toLocaleString("en-IN")} />
          <StatTile label="Active Advisors" value={m.activeAdvisors.toLocaleString("en-IN")} />
          <StatTile label="Completed Calls" value={m.completedCalls.toLocaleString("en-IN")} />
          <StatTile label="Avg Rating" value={m.avgRating || "—"} />
        </Grid>
        <Grid>
          <StatTile label="Repeat Buyer Rate" value={`${m.repeatBuyerRate}%`} />
          <StatTile label="Repeat Advisor Rate" value={`${m.repeatAdvisorRate}%`} />
          <StatTile label="Pending Verification" value={m.pendingVerification} sub={`${m.verifiedAdvisors} verified · ${m.rejectedAdvisors} rejected`} />
          <StatTile label="Sessions Today" value={m.sessionsToday} sub={`${m.activeSessionUsers} active users`} />
        </Grid>
      </div>
    );
  }

  if (tab === "Marketplace") {
    const liquidity = Object.fromEntries(
      Object.entries(m.liquidityByProject).map(([k, v]) => [k, v.ratio]),
    );
    // "Which advisors convert best?" — only rank advisors with real traffic,
    // so a single lucky call doesn't outrank someone with 50 views and 20 calls.
    const ranked = m.advisorConversion.filter((a) => a.views >= 3);
    const conversionData = Object.fromEntries(ranked.map((a) => [a.advisorId, a.conversionRate]));
    const laggingCount = ranked.filter((a) => a.conversionRate < 20).length;
    return (
      <div className="space-y-4">
        <Grid>
          <StatTile label="Calls Requested" value={m.callsRequested} />
          <StatTile label="Cancellation Rate" value={`${m.cancellationRate}%`} />
          <StatTile label="Advisor Acceptance" value={`${m.acceptanceRate}%`} />
          <StatTile label="Median Response" value={`${m.medianResponseSec}s`} />
        </Grid>
        <Panel title="Supply vs Demand by Project" subtitle="Buyers per active advisor — high = starved of advisors (recruit here)">
          <BarList data={liquidity} fmt={(n) => `${n}:1`} empty="No call requests yet" />
        </Panel>
        <Panel
          title="Advisor Conversion Rate"
          subtitle="Profile view → completed call, advisors with 3+ views"
        >
          <BarList data={conversionData} fmt={(n) => `${n}%`} empty="Not enough traffic yet" />
          {ranked.length > 0 && (
            <p className="mt-4 border-t border-border pt-3 text-[11.5px] text-muted-foreground">
              {laggingCount > 0
                ? `${laggingCount} of ${ranked.length} advisors are converting under 20% — investigate response time, rate, or profile quality before recruiting more supply for their projects.`
                : "All advisors with meaningful traffic are converting at 20%+ — safe to prioritize recruitment by the Supply vs Demand panel above."}
            </p>
          )}
        </Panel>
        <Panel title="Operational Bottlenecks" subtitle="Where the machine is stalling">
          <Grid>
            <StatTile label="Verification Backlog" value={m.bottlenecks.verificationBacklog} />
            <StatTile label="SLA Breaches" value={m.bottlenecks.slaBreaches} />
            <StatTile label="Slow Responses" value={m.bottlenecks.slowResponses} sub=">2 min to accept" />
            <StatTile label="Unconnected Requests" value={m.bottlenecks.unconnectedRequests} />
          </Grid>
        </Panel>
      </div>
    );
  }

  if (tab === "Growth") {
    const f = m.funnel;
    return (
      <div className="space-y-4">
        <Panel title="AARRR Funnel" subtitle="Acquisition → Activation → Retention → Revenue">
          <Funnel
            steps={[
              { label: "Acquired (signups)", value: f.acquired },
              { label: "Activated (funded wallet)", value: f.activated, worst: f.acquired > 0 && f.activated / f.acquired < 0.75 },
              { label: "Retained (took a call)", value: f.retained },
              { label: "Revenue (₹)", value: f.revenue },
            ]}
          />
        </Panel>
        <Grid>
          <StatTile label="View → Request" value={`${m.viewToRequestRate}%`} />
          <StatTile label="Recharge Completion" value={`${m.rechargeCompletion}%`} />
          <StatTile label="Payment Fail Rate" value={`${m.paymentFailRate}%`} />
          <StatTile label="Viral Coefficient" value={m.kFactor} sub={`${m.referralsConverted} referrals`} />
        </Grid>
      </div>
    );
  }

  if (tab === "Buyers") {
    return (
      <div className="space-y-4">
        <Grid>
          <StatTile label="Buyer Stage Moves" value={m.stageProgressions} sub="exploring → shortlisting → negotiating → ready" />
          <StatTile label="Ready to Book" value={m.readyToBookNow} sub="buyers currently at the final stage" />
        </Grid>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Demand by City" subtitle="From buyer_signup.targetCity — where to expand next">
            <BarList data={m.demandByCity} empty="No signups yet" />
          </Panel>
          <Panel title="Demand by Project" subtitle="From advisor_profile_view events">
            <BarList data={m.demandByProject} empty="No profile views yet" />
          </Panel>
          <Panel title="Top Concerns" subtitle="From review_submitted.concernTags">
            <BarList data={m.topConcerns} empty="No reviews yet" />
          </Panel>
          <Panel title="Demand by Budget" subtitle="Price band the market wants">
            <BarList data={m.demandByBudget} empty="No signups yet" />
          </Panel>
          <Panel title="⚠️ Zero-Result Searches" subtitle="Unmet demand — your expansion map">
            <BarList data={m.zeroResultQueries} empty="No unmet searches yet" />
          </Panel>
        </div>
      </div>
    );
  }

  if (tab === "Revenue") {
    return (
      <div className="space-y-4">
        <Grid>
          <StatTile label="GMV (recharges)" value={inr(m.gmv)} />
          <StatTile label="Net Revenue" value={inr(m.netRevenue)} />
          <StatTile label="Advisor Payout" value={inr(m.advisorPayout)} />
          <StatTile label="ARPU" value={inr(m.arpu)} />
        </Grid>
        <Panel title="Revenue Leakage" subtitle="Money that intended to flow but didn't">
          <Grid>
            <StatTile label="Failed Payment Value" value={inr(m.revenueLeakage.failedPaymentValue)} />
            <StatTile label="Abandoned Recharges" value={m.revenueLeakage.abandonedRecharges} />
            <StatTile label="Idle Wallets" value={m.revenueLeakage.idleWalletCount} />
            <StatTile label="Missed Demand" value={m.revenueLeakage.missedDemand} sub="interest never monetized" />
            <StatTile label="Low-Balance Blocks" value={m.lowBalanceHits} sub="calls blocked, wallet too low" />
          </Grid>
        </Panel>
        <p className="text-[11.5px] text-soft">
          Revenue metrics populate once wallet recharges &amp; completed calls flow
          (Phase 2). The wiring is already live — these are real zeros, not stubs.
        </p>
      </div>
    );
  }

  // Trust
  return (
    <div className="space-y-4">
      <Grid>
        <StatTile tone="north" label="NDT Trust Index" value={m.ndtTrustIndex} sub="verified supply · quality · delivery · consent" />
        <StatTile label="Verified Advisors" value={m.verifiedAdvisors} />
        <StatTile label="Pending Verification" value={m.pendingVerification} />
        <StatTile label="Avg Verification" value={`${m.avgVerificationHours}h`} />
      </Grid>
      <Grid>
        <StatTile label="Rejected Advisors" value={m.rejectedAdvisors} />
        <StatTile label="Consent Rate" value={`${m.consentRate}%`} sub="protects the recording corpus" />
        <StatTile label="Recordings Captured" value={m.recordingsCaptured} />
        <StatTile label="Total Events" value={m._total.toLocaleString("en-IN")} sub="the source of truth" />
      </Grid>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>;
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-[4%] py-24 text-center text-muted-foreground">
      {children}
    </div>
  );
}
