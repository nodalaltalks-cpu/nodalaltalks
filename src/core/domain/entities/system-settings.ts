/**
 * system_settings/global — founder-configurable business rules that must
 * never be hardcoded (commission %, wallet limits, ...). A singleton doc;
 * `get()` returns DEFAULT_SYSTEM_SETTINGS when it's never been written, so
 * nothing breaks before a founder ever visits the settings screen.
 */
export interface SystemSettings {
  /** Platform take-rate on call revenue, 0–1. Was hardcoded in commission.ts. */
  platformCommissionRate: number;
  /** Wallet recharge bounds, in paise. Was hardcoded in the recharge API route. */
  walletRechargeMinPaise: number;
  walletRechargeMaxPaise: number;
  /** Free minutes on a buyer's FIRST completed call (the AstroTalk-style
   *  subsidized first experience). 0 disables the offer entirely. */
  freeFirstCallMinutes: number;
  /** Advisor per-minute rate bounds, in paise. Enforced server-side at
   *  application submission — the onboarding UI mirrors them. */
  advisorRateMinPaise: number;
  advisorRateMaxPaise: number;

  updatedAt: number;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  platformCommissionRate: 0.2,
  walletRechargeMinPaise: 10_000, // ₹100
  walletRechargeMaxPaise: 5_000_000, // ₹50,000
  freeFirstCallMinutes: 5,
  advisorRateMinPaise: 3_000, // ₹30/min
  advisorRateMaxPaise: 12_000, // ₹120/min
  updatedAt: 0,
};
