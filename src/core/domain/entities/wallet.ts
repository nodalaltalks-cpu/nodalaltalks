/**
 * wallets/{buyerId} — a buyer's prepaid balance. Balance integrity is
 * server-owned: clients can READ their wallet but never write it. All mutations
 * happen via privileged server logic (recharge verify, call debit, refund),
 * which writes the wallet and an immutable transaction together.
 */
export interface Wallet {
  buyerId: string;
  balancePaise: number;
  /** Lifetime recharged, for ARPU/segmenting (also derivable from events). */
  totalRechargedPaise: number;
  lastActivityAt?: number;
  createdAt: number;
  updatedAt: number;
}
