import "server-only";
import type {
  CallSettlement,
  LedgerEntry,
  LedgerResult,
  WalletLedger,
} from "@core/application/ports";
import type { TransactionType } from "@core/domain/entities";
import { getFirebaseAdmin } from "../firebase/admin";
import { COLLECTIONS } from "../firebase/collections";

/**
 * Admin-SDK wallet ledger. Updates the wallet balance and writes the immutable
 * transaction in a single Firestore transaction, so balance and ledger can never
 * disagree and concurrent recharges/debits don't race. Server-only; clients are
 * blocked from these collections by Security Rules.
 */
export class AdminWalletLedger implements WalletLedger {
  private readonly db = getFirebaseAdmin().db;

  credit(buyerId: string, amountPaise: number, entry: LedgerEntry): Promise<LedgerResult> {
    return this.move(buyerId, amountPaise, "recharge", entry);
  }

  debit(buyerId: string, amountPaise: number, entry: LedgerEntry): Promise<LedgerResult> {
    return this.move(buyerId, -amountPaise, "call_debit", entry);
  }

  async settleCall(settlement: CallSettlement): Promise<LedgerResult> {
    const { buyerId, advisorId, callId, amountChargedPaise, advisorPayoutPaise } = settlement;
    const walletRef = this.db.collection(COLLECTIONS.WALLETS).doc(buyerId);
    const debitTxnRef = this.db.collection(COLLECTIONS.TRANSACTIONS).doc();
    const payoutTxnRef = this.db.collection(COLLECTIONS.TRANSACTIONS).doc();
    const now = Date.now();

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const data = snap.exists ? snap.data()! : null;
      const current = (data?.balancePaise as number) ?? 0;
      const next = current - amountChargedPaise;
      if (next < 0) throw new Error("Insufficient wallet balance.");
      const status = (data?.status as string) ?? "active";
      if (status === "frozen") throw new Error("Wallet is frozen.");

      tx.set(
        walletRef,
        {
          buyerId,
          balancePaise: next,
          totalRechargedPaise: (data?.totalRechargedPaise as number) ?? 0,
          status,
          lastActivityAt: now,
          updatedAt: now,
          createdAt: (data?.createdAt as number) ?? now,
          version: ((data?.version as number) ?? 0) + 1,
        },
        { merge: true },
      );
      // Buyer's debit and the advisor's payout line are written in the SAME
      // transaction — a charge must never exist without its matching payout
      // record. Advisors have no wallet balance yet; this is the audit line
      // future payout settlement (bank transfer) will sum and pay out from.
      tx.set(debitTxnRef, {
        id: debitTxnRef.id,
        ownerId: buyerId,
        type: "call_debit",
        amountPaise: amountChargedPaise,
        balanceAfterPaise: next,
        status: "success",
        ref: callId,
        createdAt: now,
        schemaVersion: 1,
      });
      tx.set(payoutTxnRef, {
        id: payoutTxnRef.id,
        ownerId: advisorId,
        type: "advisor_payout",
        amountPaise: advisorPayoutPaise,
        status: "success",
        ref: callId,
        createdAt: now,
        schemaVersion: 1,
      });
      return { balanceAfterPaise: next, transactionId: debitTxnRef.id };
    });
  }

  private async move(
    buyerId: string,
    deltaPaise: number,
    type: TransactionType,
    entry: LedgerEntry,
  ): Promise<LedgerResult> {
    const walletRef = this.db.collection(COLLECTIONS.WALLETS).doc(buyerId);
    const txnRef = this.db.collection(COLLECTIONS.TRANSACTIONS).doc();
    const now = Date.now();

    const balanceAfterPaise = await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const data = snap.exists ? snap.data()! : null;
      const current = (data?.balancePaise as number) ?? 0;
      const next = current + deltaPaise;
      if (next < 0) throw new Error("Insufficient wallet balance.");

      const totalRecharged =
        ((data?.totalRechargedPaise as number) ?? 0) + (deltaPaise > 0 ? deltaPaise : 0);
      const status = (data?.status as string) ?? "active";
      if (status === "frozen") throw new Error("Wallet is frozen.");

      tx.set(
        walletRef,
        {
          buyerId,
          balancePaise: next,
          totalRechargedPaise: totalRecharged,
          status,
          lastActivityAt: now,
          updatedAt: now,
          createdAt: (data?.createdAt as number) ?? now,
          version: ((data?.version as number) ?? 0) + 1,
        },
        { merge: true },
      );
      tx.set(txnRef, {
        id: txnRef.id,
        ownerId: buyerId,
        type,
        amountPaise: Math.abs(deltaPaise),
        balanceAfterPaise: next,
        status: "success",
        method: entry.method ?? null,
        ref: entry.orderId ?? entry.callId ?? null,
        createdAt: now,
        schemaVersion: 1,
      });
      return next;
    });

    return { balanceAfterPaise, transactionId: txnRef.id };
  }
}
