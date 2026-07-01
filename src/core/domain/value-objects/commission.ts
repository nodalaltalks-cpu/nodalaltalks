import type { Paise } from "./money";

/**
 * Platform take-rate on call revenue. Hardcoded today because `system_settings`
 * (founder-configurable commission %) doesn't exist yet — this is the ONE place
 * the rate lives, so wiring it to `system_settings` later is a one-file change,
 * not a search-and-replace across use cases.
 */
export const PLATFORM_COMMISSION_RATE = 0.2; // 20%

/** Splits a call charge into the advisor's payout and the platform's fee. */
export function splitCallCharge(amountChargedPaise: Paise): {
  advisorPayoutPaise: Paise;
  platformFeePaise: Paise;
} {
  const platformFeePaise = Math.round(amountChargedPaise * PLATFORM_COMMISSION_RATE);
  return {
    advisorPayoutPaise: amountChargedPaise - platformFeePaise,
    platformFeePaise,
  };
}
