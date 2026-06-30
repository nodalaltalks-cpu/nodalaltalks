import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@infra/firebase/admin";
import { isRole, isStaffRole, type Role } from "@core/domain/value-objects/role";

/**
 * Guarded role-elevation endpoint. The ONLY path that sets a role custom claim.
 *
 * Security:
 *  1. Requires a valid Firebase ID token (Authorization: Bearer …).
 *  2. The caller's own claim must be staff (verifier/founder/admin).
 *  3. Only verifiers+ may grant 'advisor'; granting staff roles requires admin.
 *
 * Runs on the Node runtime because the Admin SDK is not edge-compatible.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { auth } = getFirebaseAdmin();

  // 1) Authenticate the caller.
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let caller;
  try {
    caller = await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2) Caller must be staff.
  const callerRole = caller.role as Role | undefined;
  if (!isStaffRole(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Validate payload + escalation rules.
  const body = (await req.json().catch(() => null)) as {
    uid?: string;
    role?: string;
  } | null;
  if (!body?.uid || !isRole(body.role)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (isStaffRole(body.role) && callerRole !== "founder" && callerRole !== "admin") {
    return NextResponse.json(
      { error: "Only admins may grant staff roles" },
      { status: 403 },
    );
  }

  // Grant the role via custom claim — the authoritative source for Security Rules.
  await auth.setCustomUserClaims(body.uid, { role: body.role });

  return NextResponse.json({ ok: true, uid: body.uid, role: body.role });
}
