/**
 * wallets/{buyerId} — a buyer's prepaid balance. Balance integrity is
 * server-owned: clients can READ their wallet but never write it. All mutations
 * happen via privileged server logic (recharge verify, call debit, refund),
 * which writes the wallet and an immutable transaction together.
 */
export type WalletStatus = "active" | "frozen";

export interface Wallet {
  buyerId: string;
  balancePaise: number;
  /** Lifetime recharged, for ARPU/segmenting (also derivable from events). */
  totalRechargedPaise: number;
  /** "frozen" reserved for future fraud/dispute holds; ledger writes may check this later. */
  status: WalletStatus;
  lastActivityAt?: number;
  createdAt: number;
  updatedAt: number;
  /** Bumped on every ledger write; lets future migrations detect the doc shape. */
  version: number;
  /** Extension point for future structured signals (e.g. risk flags). Unpopulated today. */
  metadata?: Record<string, unknown>;
}
