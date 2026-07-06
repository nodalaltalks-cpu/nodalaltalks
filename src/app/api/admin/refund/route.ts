import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@infra/firebase/admin";
import { AdminWalletLedger } from "@infra/repositories/admin-wallet-ledger";

/**
 * Founder-initiated refund — the only credit path besides a verified
 * recharge. Founder/admin only (verifiers cannot move money). Uses the same
 * atomic WalletLedger as every other money movement; recorded with type
 * "refund" so GMV/recharge metrics stay honest.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { auth } = getFirebaseAdmin();

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  let caller;
  try {
    caller = await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (caller.role !== "founder" && caller.role !== "admin") {
    return NextResponse.json({ error: "Only founders/admins may issue refunds." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    buyerId?: string;
    amountPaise?: number;
    reason?: string;
  } | null;
  if (
    !body?.buyerId ||
    typeof body.amountPaise !== "number" ||
    !Number.isInteger(body.amountPaise) ||
    body.amountPaise <= 0 ||
    !body.reason?.trim()
  ) {
    return NextResponse.json(
      { error: "buyerId, a positive integer amountPaise, and a reason are required." },
      { status: 400 },
    );
  }

  try {
    const res = await new AdminWalletLedger().refund(body.buyerId, body.amountPaise, {
      method: `refund:${caller.uid}:${body.reason.trim().slice(0, 200)}`,
    });
    return NextResponse.json({ balancePaise: res.balanceAfterPaise, transactionId: res.transactionId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Refund failed." }, { status: 400 });
  }
}
