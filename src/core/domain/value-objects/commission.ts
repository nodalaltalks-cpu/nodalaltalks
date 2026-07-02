import type { Paise } from "./money";

/**
 * Platform take-rate on call revenue. This default is used only where the
 * caller has no SystemSettings loaded yet (e.g. the onboarding rate preview,
 * which has no server round-trip). Real call billing (endCall) now sources
 * the live, founder-configurable rate from `system_settings/global` and
 * passes it explicitly — see splitCallCharge's `commissionRate` param.
 */
export const PLATFORM_COMMISSION_RATE = 0.2; // 20%

/** Splits a call charge into the advisor's payout and the platform's fee. */
export function splitCallCharge(
  amountChargedPaise: Paise,
  commissionRate: number = PLATFORM_COMMISSION_RATE,
): {
  advisorPayoutPaise: Paise;
  platformFeePaise: Paise;
} {
  const platformFeePaise = Math.round(amountChargedPaise * commissionRate);
  return {
    advisorPayoutPaise: amountChargedPaise - platformFeePaise,
    platformFeePaise,
  };
}
