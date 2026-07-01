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

export interface WalletLedger {
  credit(buyerId: string, amountPaise: number, entry: LedgerEntry): Promise<LedgerResult>;
  /** Debits the wallet; throws on insufficient balance. Used by call billing (F8). */
  debit(buyerId: string, amountPaise: number, entry: LedgerEntry): Promise<LedgerResult>;
}
