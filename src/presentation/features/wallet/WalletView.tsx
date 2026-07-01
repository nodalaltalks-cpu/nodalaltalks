"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPaise, rupeesToPaise } from "@core/domain/value-objects/money";
import type { Transaction } from "@core/domain/entities";
import { useAuth } from "@/presentation/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useRecharge, useWallet } from "./hooks";

const PRESETS_RUPEES = [200, 500, 1000, 2000];

export function WalletView() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useWallet();
  const recharge = useRecharge();
  const [amount, setAmount] = useState(500);

  if (loading) return <Center>Loading…</Center>;
  if (!user) {
    return (
      <Center>
        <h1 className="text-xl font-extrabold">Sign in to view your wallet</h1>
        <Link href="/buyer/signup" className="mt-3 inline-block font-semibold text-amber">
          Create your buyer account →
        </Link>
      </Center>
    );
  }

  const balancePaise = data?.wallet?.balancePaise ?? 0;
  const amountPaise = rupeesToPaise(amount);
  const valid = amount >= 100 && amount <= 50000;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-[4%] py-10 lg:grid-cols-[1fr_1.2fr]">
      {/* balance + recharge */}
      <div>
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-ink to-ink-2 p-7 text-white">
          <div className="pointer-events-none absolute -right-[15%] -top-[30%] h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.18),transparent_65%)]" />
          <div className="relative">
            <div className="text-xs text-white/45">Wallet balance</div>
            <div className="mt-2 font-display text-4xl font-extrabold tracking-tight">
              {isLoading ? "—" : formatPaise(balancePaise)}
            </div>
            <div className="mt-2 text-xs text-white/40">Fully refundable · never expires</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border-[1.5px] border-border bg-white p-5 shadow-sh">
          <div className="mb-3 text-[13px] font-bold">Add money</div>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS_RUPEES.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={cn(
                  "rounded-[10px] border-[1.5px] py-3 font-display text-sm font-bold transition-all",
                  amount === p
                    ? "border-amber bg-amber-pale text-[#92400E]"
                    : "border-[color:var(--border-2)] text-ink hover:border-amber-2",
                )}
              >
                ₹{p}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center rounded-[10px] border-2 border-[color:var(--border-2)] px-4">
            <span className="text-sm text-soft">₹</span>
            <input
              type="number"
              value={amount}
              min={100}
              max={50000}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-transparent py-3 pl-1 font-display text-[15px] font-bold outline-none"
            />
          </div>
          {!valid && <p className="mt-2 text-[11.5px] font-medium text-rose">Enter ₹100–₹50,000.</p>}
          {recharge.isError && (
            <p className="mt-2 text-[11.5px] font-medium text-rose">{recharge.error?.message}</p>
          )}

          <button
            disabled={!valid || recharge.isPending}
            onClick={() => recharge.mutate(amountPaise)}
            className="mt-3 w-full rounded-[11px] bg-amber py-3.5 font-display text-[14.5px] font-extrabold text-ink transition-all hover:bg-amber-2 disabled:opacity-50"
          >
            {recharge.isPending ? "Processing…" : `Add ${formatPaise(amountPaise)}`}
          </button>
          <div className="mt-3 flex gap-2 rounded-[10px] border border-green/20 bg-[rgba(16,185,129,.07)] p-3 text-[11.5px] leading-snug text-[#065F46]">
            <span>💳</span>
            <span>Placeholder payments (auto-captured). Swap in Razorpay/Stripe later with no code change to billing.</span>
          </div>
        </div>
      </div>

      {/* transactions */}
      <div className="rounded-2xl border-[1.5px] border-border bg-white p-5 shadow-sh">
        <h3 className="mb-4 text-[15px] font-extrabold">Transactions</h3>
        {isLoading && <div className="h-24 animate-pulse rounded-xl bg-surface-2" />}
        {!isLoading && (data?.txns.length ?? 0) === 0 && (
          <div className="py-10 text-center text-[12.5px] text-soft">
            No transactions yet — add money to get started.
          </div>
        )}
        <div className="divide-y divide-border">
          {data?.txns.map((t) => <TxnRow key={t.id} t={t} />)}
        </div>
      </div>
    </div>
  );
}

function TxnRow({ t }: { t: Transaction }) {
  const credit = t.type === "recharge" || t.type === "refund";
  const label =
    t.type === "recharge" ? "Wallet recharge"
    : t.type === "refund" ? "Refund"
    : t.type === "advisor_payout" ? "Advisor payout"
    : "Call charge";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-[10px] text-base", credit ? "bg-[#DCFCE7]" : "bg-[#FFF1F2]")}>
        {credit ? "↓" : "↑"}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold">{label}</div>
        <div className="text-[11px] text-soft">
          {new Date(t.createdAt).toLocaleString("en-IN")}
          {t.method ? ` · ${t.method}` : ""}
        </div>
      </div>
      <div className={cn("ml-auto font-display text-[13.5px] font-bold", credit ? "text-green" : "text-rose")}>
        {credit ? "+" : "−"}{formatPaise(t.amountPaise)}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-[4%] py-24 text-center text-muted-foreground">{children}</div>;
}
