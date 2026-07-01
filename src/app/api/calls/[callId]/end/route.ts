import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@infra/firebase/admin";
import { buildEndCallDeps } from "@infra/server-composition";
import { endCall, type EndCallReason } from "@core/application/use-cases/calls";
import { isRole, type Role } from "@core/domain/value-objects/role";

/**
 * End-call endpoint — the only path that can write a call's billing fields.
 * Authenticates the caller, runs endCall server-side (duration → charge →
 * atomic wallet debit + advisor payout → event), mirroring /api/wallet/recharge.
 */
export const runtime = "nodejs";

const VALID_REASONS: EndCallReason[] = ["buyer_hangup", "advisor_hangup", "connection_lost"];

export async function POST(req: Request, { params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
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

  const body = (await req.json().catch(() => null)) as { reason?: string } | null;
  const reason: EndCallReason = VALID_REASONS.includes(body?.reason as EndCallReason)
    ? (body!.reason as EndCallReason)
    : "buyer_hangup";

  const role: Role = isRole(decoded.role) ? decoded.role : "buyer";

  try {
    const call = await endCall(callId, { uid: decoded.uid, role }, reason, buildEndCallDeps());
    return NextResponse.json({
      status: call.status,
      durationSec: call.durationSec,
      amountChargedPaise: call.amountChargedPaise,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Could not end call." }, { status: 400 });
  }
}
