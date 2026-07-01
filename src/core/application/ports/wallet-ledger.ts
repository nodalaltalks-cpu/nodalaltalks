/**
 * Server-side, atomic wallet mutations. Implemented by an Admin-SDK adapter that
 * updates the wallet balance and writes an immutable transaction in a single
 * Firestore transaction — clients never touch these (Security Rules deny it).
 * Money is in paise (integer) throughout the ledger.
 */
export interface LedgerEntry {
  method?: string;
  orderId?: string;
  callId?: string;
}

export interface LedgerResult {
  balanceAfterPaise: number;
  transactionId: string;
}

export interface CallSettlement {
  callId: string;
  buyerId: string;
  advisorId: string;
  amountChargedPaise: number;
  advisorPayoutPaise: number;
}

export interface WalletLedger {
  credit(buyerId: string, amountPaise: number, entry: LedgerEntry): Promise<LedgerResult>;
  /** Debits the wallet; throws on insufficient balance. */
  debit(buyerId: string, amountPaise: number, entry: LedgerEntry): Promise<LedgerResult>;
  /**
   * Debits the buyer for a completed call and records the advisor's payout line
   * in the SAME Firestore transaction — a charge must never exist without its
   * matching payout record, or vice versa. Advisors have no wallet balance today
   * (payout settlement to their bank account is a future feature); this only
   * writes the immutable `transactions` audit line their payout is computed from.
   */
  settleCall(settlement: CallSettlement): Promise<LedgerResult>;
}
