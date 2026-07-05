# App Audit

**Date:** 2026-07-05
**Method:** Ran the app against a live Firebase Emulator Suite (Auth + Firestore + Storage, freshly restarted, empty DB seeded with one active advisor + property, one submitted advisor + document, one buyer wallet, one completed call, one notification, and founder/verifier staff accounts). Inspected all 11 routes via the browser preview tool — DOM content, console errors, and network behavior — not just code reading. No application code was modified.

**Environment caveat that applies to every row below**: this environment has no real Firebase project, only the Local Emulator Suite with a fake `demo-nodalaltalks` project id. Everything marked "Firebase connected: Yes" was verified against the emulator, which exercises the same client/Admin SDK code paths as a real project — with one known exception (phone-auth reCAPTCHA, noted on `/buyer/signup`) that is specific to fake demo projects and would not occur against a real one.

---

## 1. `/` — Landing page

1. **Route**: `/`
2. **Purpose**: Marketing entry point — introduce the product, drive signups.
3. **Working**: Loads without errors.
4. **Partially working**: —
5. **Placeholder**: **Yes.** Content is a leftover "FOUNDATION · FEATURE 1" developer-status banner ("core / events / ports", "40+ verbs, typed"), not real marketing copy. No links to `/buyer/signup` or `/advisor/onboarding`.
6. **Missing functionality**: Real marketing content; navigation/CTAs into the actual product; the "Landing Website" prototype referenced in the original design brief was not found integrated here.
7. **Backend connected?** No
8. **Firebase connected?** No
9. **Ready for production?** **No**

## 2. `/buyer/signup` — Buyer registration

1. **Route**: `/buyer/signup`
2. **Purpose**: 3-step buyer onboarding — phone number → OTP → name/city/intent/budget/timeline — ending in a `users/{uid}` record.
3. **Working**: Step 1 form renders correctly, validates phone format (Zod), correct copy and design.
4. **Partially working**: **Yes.** Clicking "Send OTP" calls the real Auth Emulator (confirmed via direct REST calls that the emulator itself issues a real OTP correctly), but the browser-side `RecaptchaVerifier` repeatedly fails to initialize ("Failed to initialize reCAPTCHA Enterprise config") because a fake `demo-` project has no registered reCAPTCHA site key. The button gets stuck on "Sending…" and step 2 is never reached in this environment.
5. **Placeholder**: No.
6. **Missing functionality**: A live pass against a **real** Firebase project (where reCAPTCHA has a real site key) has not been done — this is the single largest open verification gap in the app.
7. **Backend connected?** Yes (`registerBuyer` use case, wired for step 3)
8. **Firebase connected?** Yes (Auth phone sign-in + Firestore write)
9. **Ready for production?** **No** — cannot confirm the core signup flow completes until verified against a real project.

## 3. `/buyer` — Advisor search

1. **Route**: `/buyer`
2. **Purpose**: Public directory of verified advisors; buyers search/browse before signing up.
3. **Working**: **Yes.** Confirmed live: real Firestore query returns the seeded active advisor with correct name, city, rating, bio, and rate. The search box genuinely filters the fetched list client-side (verified in code: `AdvisorSearch.tsx` filters on project/city/name as you type) — not decorative.
4. **Partially working**: —
5. **Placeholder**: No.
6. **Missing functionality**: No server-side/indexed full-text search (client-side substring filter over a capped 50-result list) — fine at current scale, won't scale to a large advisor base without a real search index.
7. **Backend connected?** Yes (`useActiveAdvisors` → `AdvisorProfileRepository.listActive`)
8. **Firebase connected?** Yes (Firestore, public read, no auth required)
9. **Ready for production?** **Yes**, for current scale.

## 4. `/buyer/advisor/[id]` — Advisor profile

1. **Route**: `/buyer/advisor/[id]`
2. **Purpose**: Full advisor profile — property, rating, reviews, "Talk Now" call entry point.
3. **Working**: **Yes.** Confirmed live, signed out: name, verified badge, "Lodha Palava City · Lodha Group · Dombivali", rating, expertise chips all render correctly. This confirms the properties-Security-Rules fix (denormalized public fields on `AdvisorProfile`) is working as intended for anonymous visitors.
4. **Partially working**: "Talk Now" for a signed-out visitor correctly shows "Sign in to start a call." (verified in code — `useRequestCall` throws, and the UI renders `requestCall.error.message`) rather than crashing, but the actual authenticated call-request flow was not click-tested live this pass (requires a signed-in buyer session, which this environment's OTP flow currently blocks — see #2).
5. **Placeholder**: No.
6. **Missing functionality**: Live-authenticated verification of "Talk Now" → call screen handoff.
7. **Backend connected?** Yes (`useAdvisorProfile`, `useAdvisorReviews`, `useRequestCall`)
8. **Firebase connected?** Yes (Firestore, public + gated reads)
9. **Ready for production?** **Yes** for the profile view itself; **call initiation unverified live**.

## 5. `/advisor/onboarding` — Advisor (owner) sign-up

1. **Route**: `/advisor/onboarding`
2. **Purpose**: 5-step advisor application — personal info, property details, documents & bank, profile & rate, agreement.
3. **Working**: **Yes.** Confirmed live: full step-1 form renders correctly (all fields, language chips, day-of-week selectors, rate copy "₹30–₹120/min"). No auth required to view the form (submission requires auth).
4. **Partially working**: Steps 2–5 and the final submission were not click-tested live this pass; covered by passing unit tests (`submit-advisor-application.test.ts`) and this session's earlier live-seeded-data verification confirmed the resulting Firestore documents have the correct shape.
5. **Placeholder**: No.
6. **Missing functionality**: Advisor rate bounds (₹30–₹120) are enforced only in the UI, not validated server-side in `submitAdvisorApplication` — a scripted client could submit outside this range.
7. **Backend connected?** Yes (`submitAdvisorApplication`)
8. **Firebase connected?** Yes (Firestore writes across 4 collections + Storage upload)
9. **Ready for production?** **Partially** — functionally solid, needs the server-side rate-bound validation gap closed first.

## 6. `/buyer/wallet` — Wallet & recharge

1. **Route**: `/buyer/wallet`
2. **Purpose**: View balance/transaction history; recharge via the (placeholder) payment gateway.
3. **Working**: The sign-out gate works correctly — confirmed live: "Sign in to view your wallet" renders cleanly, no console errors, no unauthorized data fetch attempted.
4. **Partially working**: Authenticated wallet view + recharge flow not click-tested live this pass (blocked on the same OTP issue as #2); covered by passing unit tests for `rechargeWallet` and confirmed via direct Firestore seeding that the read path renders correctly (verified earlier in this engagement).
5. **Placeholder**: The payment gateway itself is `PlaceholderPaymentGateway` (auto-captures, no real payment provider) — appropriate for beta, not for real money.
6. **Missing functionality**: Live-authenticated recharge click-through; a real payment provider before handling real money.
7. **Backend connected?** Yes (`rechargeWallet`, `/api/wallet/recharge`)
8. **Firebase connected?** Yes (server-owned `wallets`/`transactions`)
9. **Ready for production?** **No** — real payment provider required before this can go live with real money; placeholder is correct for a beta with fake/test currency only.

## 7. `/buyer/notifications` — Notification inbox

1. **Route**: `/buyer/notifications`
2. **Purpose**: In-app inbox for call receipts and account updates.
3. **Working**: Sign-out gate works correctly — confirmed live, clean render, no console errors.
4. **Partially working**: Authenticated inbox view not click-tested live this pass.
5. **Placeholder**: Push delivery is `ConsoleNotificationService` (logs instead of a real push) — the in-app Firestore record is real, only the push channel is a stub.
6. **Missing functionality**: Only wired into call completion — recharge, verification decisions, and other notification-worthy events don't create one yet. Real FCM push adapter.
7. **Backend connected?** Yes (`NotificationRepository`)
8. **Firebase connected?** Yes (server-owned `notifications`, client read/mark-read)
9. **Ready for production?** **Partially** — fine for beta (in-app receipts work), needs real push before a full launch.

## 8. `/buyer/call/[callId]` — Live call screen

1. **Route**: `/buyer/call/[callId]`
2. **Purpose**: In-call UI (timer, running cost) and post-call review prompt.
3. **Working**: Correctly shows "Call not found." for a call the visitor isn't a participant in (confirmed live, no console errors) — Security Rules correctly deny the read; this is safe behavior even though the message text doesn't distinguish "doesn't exist" from "you can't see this."
4. **Partially working**: The actual in-progress call UI, hang-up, billing settlement, and review prompt were not click-tested live this pass (requires an authenticated buyer mid-call); covered by passing unit tests for `endCall`'s billing math and notification creation.
5. **Placeholder**: The underlying `CallService` is `PlaceholderCallService` — no real audio/calling infrastructure exists (Agora/Twilio not integrated). The screen and billing logic are real; the "call" itself is simulated.
6. **Missing functionality**: Real audio calling; live-authenticated end-to-end click-through of request → talk → hang up → bill → review.
7. **Backend connected?** Yes (`requestCall`, `endCall`, `submitReview`)
8. **Firebase connected?** Yes (`calls`, `wallets`, `transactions`, `reviews`, `notifications`)
9. **Ready for production?** **No** — no real calling provider; this is the single largest functional gap in the product (the core "talk to someone" mechanic doesn't carry real audio yet).

## 9. `/founder` — Founder Cockpit (dashboard)

1. **Route**: `/founder`
2. **Purpose**: Live, event-derived business metrics across 6 tabs (Executive, Marketplace, Growth, Buyers, Revenue, Trust).
3. **Working**: The access gate itself renders correctly — confirmed live: "Founder access only" shown to a signed-out visitor.
4. **Partially working**: **Bug confirmed live**: the page fires a live Firestore `onSnapshot` listener on `analytics_events` *before* checking the auth gate, throwing repeated uncaught `permission-denied` console errors for every unauthorized visit. Not a crash, but real, reproducible noise and wasted work. Authenticated dashboard rendering (all 6 tabs, real metrics) was extensively verified earlier in this engagement via `project()` unit tests and code-level review, but not re-confirmed live this pass (no staff login UI exists to sign in through the app).
5. **Placeholder**: No — every metric is genuinely derived from the event log, not hardcoded.
6. **Missing functionality**: The listener-gating fix; a staff login page (see below).
7. **Backend connected?** Yes (`useMetrics`, `useWeeklyTrend` → `project()`)
8. **Firebase connected?** Yes (live `analytics_events` subscription)
9. **Ready for production?** **No** — until the listener bug is fixed and a real staff sign-in path exists.

## 10. `/founder/settings` — Business settings

1. **Route**: `/founder/settings`
2. **Purpose**: Founder-editable commission rate and wallet recharge limits — no redeploy needed to change them.
3. **Working**: Access gate confirmed live, clean (no console errors, unlike `/founder` — this page does not have the listener-before-gate issue).
4. **Partially working**: Authenticated settings form (view/save) not click-tested live this pass; covered by passing unit tests confirming a changed commission rate actually changes call payout math.
5. **Placeholder**: No.
6. **Missing functionality**: Staff login UI (same blocker as `/founder`).
7. **Backend connected?** Yes (`SystemSettingsRepository`)
8. **Firebase connected?** Yes (`system_settings/global`)
9. **Ready for production?** **Partially** — logic is solid; blocked on the same staff-login gap.

## 11. `/verifier/documents` — Verification dashboard

1. **Route**: `/verifier/documents`
2. **Purpose**: Verifier queue for reviewing advisor KYC documents and activating/rejecting applications.
3. **Working**: Access gate confirmed live, clean (no console errors): "Verifier access only... Sign in with a verifier account to continue."
4. **Partially working**: Authenticated queue/review workbench not click-tested live this pass; the underlying 4 use cases (`startVerification`, `decideDocument`, `activateAdvisor`, `rejectAdvisor`) are unit-tested and were exercised via direct Firestore seeding earlier in this engagement, confirming correct document/profile state transitions.
5. **Placeholder**: No.
6. **Missing functionality**: Staff login UI (same blocker as `/founder`) — this is the most consequential instance of that gap, since **no advisor can ever be activated without a human using this page**, and there is currently no way to sign in and use it through the app itself.
7. **Backend connected?** Yes (verification use cases)
8. **Firebase connected?** Yes (`advisor_profiles`, `documents`, `properties`)
9. **Ready for production?** **No** — the missing staff login UI here blocks the entire advisor-supply pipeline, not just this page.

---

## Priority ranking before beta launch (highest → lowest)

1. **Staff login page** *(not a page in the list above, but the single highest-priority gap)* — blocks `/verifier/documents`, `/founder`, and `/founder/settings` simultaneously. Without it, **no advisor can be activated**, which means the marketplace has no supply and `/buyer`/`/buyer/advisor/[id]` have nothing real to show beyond seeded test data.
2. **`/buyer/signup`** — the entire buyer funnel is gated behind this. Must be verified against a real Firebase project (not just the emulator) before beta, since the current blocker is demo-project-specific.
3. **`/verifier/documents`** — see #1; listed again because once staff login exists, this page's own correctness (already unit-tested) is what actually unblocks advisor supply.
4. **`/buyer/call/[callId]`** — the core product mechanic. Even for a beta, "talk to someone" needs either a real calling provider or a clearly-communicated placeholder experience (e.g., a scripted demo call) — shipping the current silent placeholder to real users would be a trust-breaking surprise.
5. **`/founder`** — fix the listener-before-gate bug before any external users hit the site (right now every non-founder visitor to `/founder` spams a permission error). Low user-facing impact but a real, easy bug.
6. **`/buyer/advisor/[id]`** — already in good shape; verify the authenticated "Talk Now" handoff once #1 and #2 are fixed.
7. **`/buyer/wallet`** — fine for a beta using placeholder/test payments; flag clearly to beta users that no real money should be added until a real payment provider is wired in.
8. **`/buyer`** — already production-ready at current scale; no action needed before beta.
9. **`/advisor/onboarding`** — close the server-side rate-bound validation gap; otherwise ready.
10. **`/founder/settings`** — low urgency; only usable once staff login exists, and the founder can operate without changing defaults for an initial beta.
11. **`/buyer/notifications`** — lowest priority; in-app receipts work, and beta users won't notice the absence of real push notifications immediately.
12. **`/` (landing)** — lowest priority **if beta users arrive via direct/invited links** (typical for a beta); becomes high priority the moment the beta opens to organic/public traffic.
