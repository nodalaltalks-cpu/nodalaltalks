/**
 * transactions/{transactionId} — an immutable ledger line for wallet movement.
 * Created server-side only, alongside the wallet update. Append-only by design.
 */
export type TransactionType =
  | "recharge"
  | "call_debit"
  | "refund"
  | "advisor_payout";

export interface Transaction {
  id: string;
  /** Owning buyer (for wallet movements) or advisor (for payouts). */
  ownerId: string;
  type: TransactionType;
  amountPaise: number;
  balanceAfterPaise?: number;
  status: "success" | "failed" | "pending";

  method?: string; // UPI, Card, …
  /** Cross-reference: callId for debits, payment orderId for recharges. */
  ref?: string;
  failureReason?: string;

  createdAt: number;
  /** Shape version of this ledger row; lets future migrations run without a backfill. */
  schemaVersion: number;
  /** Extension point for future structured signals. Unpopulated today. */
  metadata?: Record<string, unknown>;
}
