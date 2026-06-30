/**
 * reviews/{reviewId} — a buyer's post-call signal. Publicly readable (shown on
 * advisor profiles); created once by the participating buyer and then immutable.
 * concernTags + confidenceShift hand-label the conversation corpus for free.
 */
export interface Review {
  id: string;
  callId: string;
  advisorId: string;
  buyerId: string;

  rating: number; // 1–5
  confidenceShift?: "more" | "same" | "less";
  concernTags: string[];
  comment?: string;

  createdAt: number;
}
