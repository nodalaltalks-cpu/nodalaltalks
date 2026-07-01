import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@infra/firebase/admin";
import { buildSubmitReviewDeps } from "@infra/server-composition";
import { submitReview } from "@core/application/use-cases/submit-review";
import { isRole, type Role } from "@core/domain/value-objects/role";

/**
 * Review submission endpoint — the only path that can write a review, because
 * folding its rating into the advisor's cached ratingAvg/ratingCount requires
 * the Admin SDK (Security Rules restrict that aggregate to staff writes).
 */
export const runtime = "nodejs";

const VALID_SHIFTS = ["more", "same", "less"] as const;

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
    callId?: string;
    rating?: number;
    confidenceShift?: string;
    concernTags?: string[];
    comment?: string;
  } | null;

  if (!body?.callId || typeof body.rating !== "number") {
    return NextResponse.json({ error: "callId and rating are required." }, { status: 400 });
  }

  const confidenceShift = VALID_SHIFTS.includes(body.confidenceShift as (typeof VALID_SHIFTS)[number])
    ? (body.confidenceShift as "more" | "same" | "less")
    : undefined;

  const role: Role = isRole(decoded.role) ? decoded.role : "buyer";

  try {
    const review = await submitReview(
      { uid: decoded.uid, role },
      {
        callId: body.callId,
        rating: body.rating,
        confidenceShift,
        concernTags: Array.isArray(body.concernTags) ? body.concernTags.slice(0, 10) : undefined,
        comment: typeof body.comment === "string" ? body.comment.slice(0, 1000) : undefined,
      },
      buildSubmitReviewDeps(),
    );
    return NextResponse.json({ review });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Could not submit review." }, { status: 400 });
  }
}
