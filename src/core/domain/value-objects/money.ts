/**
 * Money is always represented in the smallest unit (paise) as an integer to
 * avoid floating-point drift across wallet, billing, and payout maths.
 * Currency is INR throughout the MVP.
 */
export type Paise = number;

export const RUPEE = 100; // paise per rupee

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * RUPEE);
}

export function paiseToRupees(paise: Paise): number {
  return paise / RUPEE;
}

/** Format paise as a display string, e.g. 50900 -> "₹509". */
export function formatPaise(
  paise: Paise,
  opts: { decimals?: boolean } = {},
): string {
  const rupees = paiseToRupees(paise);
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: opts.decimals ? 2 : 0,
      maximumFractionDigits: opts.decimals ? 2 : 0,
    })
  );
}

/** Per-minute billing: rate (paise/min) over a duration in seconds. */
export function callCharge(ratePerMinPaise: Paise, durationSec: number): Paise {
  return Math.round((ratePerMinPaise * durationSec) / 60);
}
