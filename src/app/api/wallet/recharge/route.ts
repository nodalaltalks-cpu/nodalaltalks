import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@infra/firebase/admin";
import { buildRechargeDeps } from "@infra/server-composition";
import { rechargeWallet } from "@core/application/use-cases/recharge-wallet";
import { isRole, type Role } from "@core/domain/value-objects/role";

/**
 * Wallet recharge endpoint. Authenticates the buyer, validates the amount, then
 * runs rechargeWallet server-side (payment verify → atomic credit → event). The
 * wallet/transactions collections are server-owned; this is the only write path.
 */
export const runtime = "nodejs";

const MIN_PAISE = 10_000; // ₹100
const MAX_PAISE = 5_000_000; // ₹50,000

export async function POST(req: Request) {
  const { auth } = getFirebaseAdmin();

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    amountPaise?: number;
    method?: string;
  } | null;
  const amountPaise = body?.amountPaise;
  if (
    typeof amountPaise !== "number" ||
    !Number.isInteger(amountPaise) ||
    amountPaise < MIN_PAISE ||
    amountPaise > MAX_PAISE
  ) {
    return NextResponse.json(
      { error: "Amount must be a whole number between ₹100 and ₹50,000." },
      { status: 400 },
    );
  }

  const role: Role = isRole(decoded.role) ? decoded.role : "buyer";

  try {
    const res = await rechargeWallet(
      { uid: decoded.uid, role },
      { amountPaise, method: body?.method },
      buildRechargeDeps(),
    );
    return NextResponse.json({
      balancePaise: res.balanceAfterPaise,
      transactionId: res.transactionId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Recharge failed." },
      { status: 400 },
    );
  }
}
