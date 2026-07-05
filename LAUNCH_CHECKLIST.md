# Launch Checklist — QA Audit Results

**Date:** 2026-07-05
**QA method:** Full live testing against the Firebase Emulator Suite (Auth + Firestore + Storage) with seeded data. **This audit went further than the earlier APP_AUDIT.md**: by injecting authenticated staff sessions directly into the Firebase SDK's IndexedDB persistence (working around the missing staff login UI), the verifier workflow, founder dashboard, business settings, wallet recharge, and notifications inbox were all exercised **live and authenticated for the first time** — including real Firestore writes, a real `/api/wallet/recharge` round-trip, and live event-log → dashboard flow.
**No application code was written or modified during this audit.**

---

## Journey-by-journey verdicts

| # | Journey | Verdict | Notes |
|---|---|---|---|
| 1 | Launch page (`/`) | 🚧 **Placeholder** | Loads clean, zero errors — but content is a "FOUNDATION · FEATURE 1" dev banner. No marketing copy, no CTAs into signup. |
| 2 | Buyer signup (`/buyer/signup`) | ⚠ **Partially Working** + 🔧 | Step-1 UI and validation work. "Send OTP" silently stalls: `RecaptchaVerifier` can't initialize against a fake `demo-` Firebase project (no reCAPTCHA site key exists for demo projects). The Auth Emulator itself issues OTPs correctly via REST — the blocker is environment-specific and **should vanish on a real Firebase project (free tier)**. Also 🔧: the UI gives no error feedback when OTP send fails — it just sticks on "Sending…" or resets silently. |
| 3 | Buyer login | ⚠ **Partially Working** (by design, then blocked) | There is no separate login page — `/buyer/signup`'s phone-OTP flow doubles as login (Firebase phone auth signs in an existing user with the same number). Inherits journey 2's blocker. Not a missing page; worth a UX label change ("Sign up or log in"). |
| 4 | Search advisors (`/buyer`) | ⚠ **Partially Working** + 🔧 | Page, live Firestore data, and result cards all work. **Confirmed live bug**: searching "Palava" — the seeded advisor's own project — returns 0 results. The filter matches only `firstName/lastName/headline/city`, never `primaryProject`/`primaryBuilder`, despite the page's headline being "Which project are you evaluating?". The product's core search promise doesn't work. |
| 5 | Advisor profile (`/buyer/advisor/[id]`) | ✅ **Working** | Fully verified live, signed out: profile, verified badge, project line, expertise chips, **and the public review list** (seeded a review; 5 stars + comment + concern tag all rendered). "Talk Now" signed-out correctly prompts "Sign in to start a call." |
| 6 | Wallet (`/buyer/wallet`) | ✅ **Working** (placeholder gateway) + 🔒 | **Full recharge round-trip verified live and authenticated**: Add ₹500 → API route → token verification → placeholder gateway → atomic ledger credit → balance ₹500 + transaction row rendered. Sign-out gate also correct. 🔒 Real money requires Razorpay/Stripe (paid service — postponed by design; the port swap needs no business-logic changes). |
| 7 | Book a call ("Talk Now") | ⚠ **Partially Working** | Signed-out rejection verified live. The authenticated request→connect path is unit-tested but was not click-tested live (needs a signed-in *buyer*, blocked by journey 2; the injected staff sessions have no wallet/buyer role to place a realistic call). |
| 8 | Call page (`/buyer/call/[id]`) | ⚠ **Partially Working** + 🔒 | Access control verified live (non-participant correctly denied — though the message says "Call not found" for a permission denial, minor 🔧). Billing math, settlement, and notifications unit-tested (42/42). 🔒 The call itself carries **no real audio** — `PlaceholderCallService` connects instantly with a fake channel. Real calling requires Agora/Twilio (paid — postponed). |
| 9 | Reviews | ✅ **Working** (read path verified live; write path unit-tested) | Public review list renders real Firestore data (verified live). Review submission (`/api/reviews`, atomic rating-aggregate fold) is unit-tested incl. double-review rejection; live click-through needs a signed-in buyer with a completed call (journey 2 blocker). |
| 10 | Notifications (`/buyer/notifications`) | ✅ **Working** | Verified live, authenticated: renders correctly (empty state for a user with no notifications; sign-out gate correct). In-app records are real; push channel is a console placeholder (fine for beta). Only wired to call-completion events so far. |
| 11 | Advisor onboarding (`/advisor/onboarding`) | ✅ **Working** (one gap) | Full 5-step form renders; submission use case unit-tested and its Firestore output previously verified. 🔧 Rate bounds (₹30–₹120/min) are UI-only — not enforced server-side. |
| 12 | Advisor dashboard | ❌ **Broken (does not exist)** | No route, no page, no code. After onboarding, an advisor has no way to see their status, calls, earnings, or notifications. See "broken pages" below. |
| 13 | Founder dashboard (`/founder`) | ✅ **Working** + 🔧 | **Verified live and authenticated for the first time**: all 6 tabs render; "TOTAL EVENTS: 2" correctly counted the two events my own QA actions emitted — the full pipeline (UI action → use case → event → Firestore → onSnapshot → `project()` → tile) works end-to-end live. `/founder/settings` also verified live: loaded defaults, saved 25%, confirmed `0.25` in Firestore, restored to 20%. 🔧 Known bug still open: the metrics listener fires before the auth gate for signed-out visitors (console `permission-denied` spam). |
| 14 | Verifier dashboard (`/verifier/documents`) | ✅ **Working** + 🔧 | **Verified live and authenticated for the first time**: queue rendered the seeded submitted advisor with SLA aging; opening the dossier fired a real `verification_started` write; approving the ownership document persisted (`status: "approved"`, `reviewerId` stamped — confirmed in Firestore); the activation checklist correctly blocked activation while the identity document is missing. 🔧 Confirmed bug: the workbench UI does not refresh after a decision — the approval only appeared after a manual page reload. |

## Broken pages — detail

### Advisor dashboard — ❌ does not exist
- **Why:** never built. Phases 1–3 built the buyer, founder, and verifier surfaces; the advisor's post-onboarding experience was never scoped as a numbered feature.
- **Exact blocker:** no route (`/advisor/dashboard` or similar), no feature folder, no hooks. The data it needs already exists (calls by advisor, transactions by owner, notifications by user — all queryable with existing repositories and rules).
- **Difficulty:** **Medium** — no new architecture needed; it's a read-only composition of existing repositories, comparable in size to the wallet + notifications pages combined. (Accepting/declining incoming calls would be additional scope; today calls auto-connect via the placeholder, so a read-only dashboard is the right first slice.)
- **Blocks beta?** **Yes** — advisors are half the marketplace; onboarding people into a black hole (no status visibility, no earnings view) is not viable even for a small beta.

### Buyer signup OTP (functionally broken *in this environment*)
- **Why:** `RecaptchaVerifier` requires a reCAPTCHA config that fake `demo-` projects don't have. The app code is correct (emulator flag already set; REST path proves the emulator works).
- **Exact blocker:** no real Firebase project configured. A free Spark-tier project with phone auth enabled resolves it.
- **Difficulty:** **Easy** (create project, fill `.env.local`, verify) — plus 🔧 Easy: surface an error message in the UI when OTP send fails instead of stalling silently.
- **Blocks beta?** **Yes** — it's the front door of the entire buyer funnel. Must be verified on a real project before anything else matters.

---

## Critical bugs (must fix before beta)

1. **Project-name search returns nothing** (`AdvisorSearch.tsx` filter omits `primaryProject`/`primaryBuilder`). Verified live: searching an advisor's own project yields 0 results. *Easy fix.*
2. **No staff login UI** — verifier/founder dashboards are fully functional (proven live via session injection) but unreachable through the product. Blocks advisor activation → blocks all marketplace supply. *Easy–Medium.*
3. **No advisor dashboard** (see above). *Medium.*
4. **Buyer OTP unverified on a real Firebase project** + silent failure UX. *Easy, but gating.*
5. **Founder dashboard opens an unauthorized Firestore listener before its auth check** — permission-denied spam for every signed-out visitor. *Easy.*

## Medium bugs

6. **Verifier workbench doesn't refresh after a document decision** — decisions persist to Firestore but the checklist/status only updates on manual reload. Verified live. *Easy.*
7. **Advisor rate bounds not enforced server-side** (₹30–₹120 UI-only). *Easy.*
8. **"Call not found" shown for permission-denied** on the call page — misleading for participants hitting an auth edge case. *Easy.*
9. **Notifications only fire on call completion** — recharge and verification decisions (approve/reject/activate) produce no notification, though those are exactly the moments advisors/buyers most need one. *Easy–Medium.*

## Nice-to-have improvements (post-beta acceptable)

- Label signup page "Sign up or log in" (journey 3 clarity).
- Real push (FCM), email/SMS adapters — in-app inbox suffices for beta.
- Search: server-side/indexed search to replace the client-side filter (only matters at scale — but fix bug #1 first regardless).
- Distinct empty-state vs. error-state on dashboard tiles.
- Landing page (see below — placement depends on beta acquisition strategy).

## Pages ready for production (at beta scale, emulator-verified)

- `/buyer/advisor/[id]` — advisor profile incl. reviews ✅
- `/buyer/wallet` — with placeholder payments clearly flagged (or real gateway when purchased) ✅
- `/buyer/notifications` ✅
- `/founder` + `/founder/settings` — once bug #5 is fixed and staff login exists ✅
- `/verifier/documents` — once bug #6 is fixed and staff login exists ✅
- `/advisor/onboarding` — once bug #7 is fixed ✅

## Pages not ready

- `/` — placeholder content 🚧
- `/buyer/signup` — unverified on real Firebase + silent-failure UX ⚠
- `/buyer` — search bug #1 ⚠
- `/buyer/call/[id]` — no real audio (🔒 paid), fine to beta only with an explicitly-communicated simulated-call experience
- Advisor dashboard — missing entirely ❌

## Beta launch readiness: **~70%**

Reasoning: the hard, risky architecture (event pipeline, atomic money movement, role-based security, verification workflow) is **proven working live** — this audit moved those from "tested in theory" to "watched it work." What remains is mostly thin, well-understood UI work (staff login, advisor dashboard, search fix, error surfacing) plus one environment step (real Firebase project). Nothing structural is broken. The two paid integrations (calling, payments) are deliberately deferred and cleanly swappable.

## Remaining milestones before first public beta (in order)

1. **Create a real Firebase (Spark) project**, fill `.env.local`, deploy rules/indexes — then verify buyer OTP signup end-to-end. *(Free)*
2. **Fix the search-by-project bug** (#1). *(Easy)*
3. **Build the staff login page** (email/password via existing `signInWithEmail`) — unblocks verifier + founder surfaces for real. *(Easy–Medium)*
4. **Fix the founder-dashboard listener gate** (#5) and **verifier workbench refresh** (#6). *(Easy each)*
5. **Build the read-only advisor dashboard** (status, earnings from transactions, call history, notifications). *(Medium)*
6. **Enforce rate bounds server-side** (#7) and **surface OTP-send errors** (#4b). *(Easy each)*
7. **Full end-to-end dress rehearsal on the real Firebase project**: signup → onboard → verify → activate → recharge → call (placeholder audio, clearly labeled) → review → founder dashboard reflects everything.
8. **Replace the landing page** — mandatory before *public* beta; optional if the beta is invite-only via direct links.
9. **Decide the calling experience for beta**: either purchase Agora/Twilio (🔒) or explicitly present calls as "request a callback" / simulated until real audio lands. Do not ship the silent placeholder without labeling it.
10. **Beta-gate real money**: keep placeholder payments with a visible "test mode" banner until Razorpay onboarding (🔒) completes.
