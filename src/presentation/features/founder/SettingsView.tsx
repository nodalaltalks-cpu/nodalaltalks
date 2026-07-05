"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAdminRole } from "@core/domain/value-objects/role";
import { paiseToRupees, rupeesToPaise } from "@core/domain/value-objects/money";
import { useAuth } from "@/presentation/providers/auth-provider";
import { Button } from "@/presentation/components/ui/button";
import { useSettings, useUpdateSettings } from "./use-settings";

/**
 * Founder-only editor for system_settings/global — the business rules the
 * standing brief says must never be hardcoded (commission %, wallet limits).
 * Values here take effect immediately: endCall and the recharge route read
 * this doc live, no redeploy needed.
 */
export function SettingsView() {
  const { user, loading: authLoading } = useAuth();
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [commissionPct, setCommissionPct] = useState(20);
  const [minRupees, setMinRupees] = useState(100);
  const [maxRupees, setMaxRupees] = useState(50000);

  useEffect(() => {
    if (!settings) return;
    setCommissionPct(Math.round(settings.platformCommissionRate * 100));
    setMinRupees(paiseToRupees(settings.walletRechargeMinPaise));
    setMaxRupees(paiseToRupees(settings.walletRechargeMaxPaise));
  }, [settings]);

  if (authLoading) return <Center>Loading…</Center>;
  if (!user || !isAdminRole(user.role)) {
    return (
      <Center>
        <h1 className="text-xl font-extrabold">Founder access only</h1>
        <a
          href="/staff/login?next=/founder/settings"
          className="mt-4 inline-block rounded-[11px] bg-amber px-6 py-3 font-display text-[13.5px] font-extrabold text-ink"
        >
          Staff sign in →
        </a>
      </Center>
    );
  }

  const valid = commissionPct >= 0 && commissionPct <= 100 && minRupees > 0 && maxRupees > minRupees;

  return (
    <div className="mx-auto max-w-xl px-[4%] py-10">
      <Link href="/founder" className="mb-4 inline-block text-[13px] font-bold text-muted-foreground hover:text-ink">
        ← Back to cockpit
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Business Settings</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Founder-configurable rules — changes take effect immediately, no deploy needed.
      </p>

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-2" />
      ) : (
        <div className="mt-6 space-y-5 rounded-2xl border-[1.5px] border-border bg-white p-6 shadow-sh">
          <Field label="Platform commission" hint="Share of every call charge NoDalalTalks keeps; the rest is the advisor's payout.">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                className="w-24 rounded-[10px] border-[1.5px] border-[color:var(--border-2)] px-3 py-2 text-[14px] font-bold outline-none focus:border-amber"
              />
              <span className="text-sm text-soft">%</span>
            </div>
          </Field>

          <Field label="Wallet recharge minimum" hint="Smallest amount a buyer can add in one recharge.">
            <RupeeInput value={minRupees} onChange={setMinRupees} />
          </Field>

          <Field label="Wallet recharge maximum" hint="Largest amount a buyer can add in one recharge.">
            <RupeeInput value={maxRupees} onChange={setMaxRupees} />
          </Field>

          {!valid && (
            <p className="text-[11.5px] font-medium text-rose">
              Commission must be 0–100%, and the maximum must exceed the minimum.
            </p>
          )}
          {update.isError && (
            <p className="text-[11.5px] font-medium text-rose">{update.error.message}</p>
          )}
          {update.isSuccess && (
            <p className="text-[11.5px] font-semibold text-green">✓ Saved</p>
          )}

          <Button
            className="bg-amber text-ink hover:bg-amber-2"
            disabled={!valid || update.isPending}
            onClick={() =>
              update.mutate({
                platformCommissionRate: commissionPct / 100,
                walletRechargeMinPaise: rupeesToPaise(minRupees),
                walletRechargeMaxPaise: rupeesToPaise(maxRupees),
              })
            }
          >
            {update.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </div>
  );
}

function RupeeInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-[10px] border-[1.5px] border-[color:var(--border-2)] px-3">
      <span className="text-sm text-soft">₹</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent py-2 pl-1 text-[14px] font-bold outline-none"
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12.5px] font-bold text-ink-2">{label}</label>
      <p className="mb-1.5 text-[11px] text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-[4%] py-24 text-center text-muted-foreground">{children}</div>;
}
