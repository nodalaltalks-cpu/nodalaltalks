# NoDalalTalks — Complete Project State

**Last updated:** 2026-07-05
**Last commit at time of writing:** `b1208ae` — "Fix: signed-out buyers couldn't view advisor profiles"
**Purpose of this document:** a single, self-contained snapshot of exactly what exists, what works, what doesn't, and what's left — written so a new engineer or a fresh Claude Code session with zero prior context can pick this up safely.

---

## Executive Summary

| Metric | Value |
|---|---|
| Overall completion (all 4 phases) | **~55%** |
| MVP completion (Phase 1 + 2) | **~95%** |
| AI readiness (Phase 4 architecture prep) | **~30%** |
| Architecture quality | **9/10** |
| Scalability | **7/10** |
| Security | **7/10** |

**Why these numbers:**
- **MVP 95%, not 100%**: every Phase 1–2 feature is built, tested, and has been verified live against a real Firebase emulator. The 5% gap is unfinished end-to-end click-through of the phone-OTP flow (works via REST, flaky via the browser SDK against a fake `demo-` project — see "Known Bugs") and the landing page still being a developer placeholder rather than real marketing content.
- **Overall 55%**: Phases 1–3 (foundation, core transactions, intelligence dashboards) are done. Phase 4 is real AI (demand prediction, recommendations, conversation intelligence) and is explicitly *not started* — only two prep features (document metadata, configurable settings) exist. Phase 4 is the largest remaining phase by scope.
- **AI readiness 30%**: the event log itself (versioned, structured, append-only) is a strong training substrate, and two real seams exist (`HashService`, document processing-status fields). But there is no AI service abstraction, no data pipeline, no model, no `AIInsightsService` port — deliberately, per the standing instruction not to build speculative interfaces before a real consumer exists.
- **Architecture 9/10**: strict, consistently-applied Clean Architecture; one pure event reducer as the single source of dashboard truth; ports/adapters for every external dependency (payments, calling, notifications, hashing, settings). Points off for: no Cloud Functions yet (all "server-side" logic runs in Next.js API routes, which is fine for MVP but will need to move for true event-driven fan-out at scale), and some UI-layer duplication between similar hooks.
- **Scalability 7/10**: the event-sourcing model and `project()` reducer are explicitly designed to move from "recompute in the browser" to "precomputed in a Cloud Function" without changing calling code — a real scalability lever already built in. Points off because that migration hasn't happened yet (every dashboard load today replays the *entire* event log client-side), there's no pagination on several list reads, and there's no caching layer.
- **Security 7/10**: Firestore rules are genuinely well-designed (role-based, field-level `unchanged()` guards on money/status fields, server-owned collections for anything financial). Points off because this session found and fixed *two* real rules bugs (properties collection blocking anonymous reads, Founder Dashboard firing a listener before checking the auth gate — the second is still open), which suggests the rules-vs-UI contract needs a systematic audit, not just spot fixes.

---

## Product Vision

NoDalalTalks is a **buyer-to-buyer real estate consultation marketplace** for India. The core insight: the best person to tell you the truth about a property is someone who already bought there — not a broker with a commission incentive. The product connects a prospective buyer with a verified existing owner of the same project, for a paid, per-minute phone consultation.

**Tagline (from the actual UI):** "Talk to someone who already bought there."

**The trust mechanism:** every advisor (an "advisor" = a verified existing property owner, not a real-estate professional) goes through a KYC-style verification: ownership proof + identity documents reviewed by a human verifier before they can receive paid calls. This is the product's core differentiator from a broker marketplace.

## Business Model

- **Buyers** pay per minute (prepaid wallet, e.g. ₹50/min) to talk to a verified owner.
- **Advisors** (owners) set their own rate (currently bounded ₹30–₹120/min in the onboarding UI) and earn a payout per completed call.
- **Platform take-rate**: a configurable commission (default 20%, founder-adjustable via `/founder/settings`, backed by `system_settings/global` — see [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md)) is deducted from every call charge before the advisor payout.
- **No listing fees, no lead-gen fees** — revenue is 100% a cut of consultation minutes (GMV = wallet recharges; Net Revenue = call charges minus advisor payouts).
- **Long-term asset**: the founders' stated thesis (see the original engineering brief) is that the append-only event log itself — buyer intent, advisor performance, concern themes from reviews — is a data moat as valuable as the marketplace, meant to power future AI (demand prediction, advisor recommendations, conversation intelligence).

## Current Implementation Status — Feature by Feature

### Phase 1 — Foundation (✅ complete)
| # | Feature | Status |
|---|---|---|
| 1 | Foundation + Event Core | ✅ Done — event taxonomy (40+ verbs), `project()` reducer, port interfaces |
| 2 | Firebase + Auth + Security Rules | ✅ Done — domain entities, AuthService, Firestore/in-memory EventRepository, firestore.rules/storage.rules, emulator config |
| 3 | Advisor Onboarding | ✅ Done — 5-step form, `submitAdvisorApplication`, document upload, events |
| 4 | Documents Dashboard | ✅ Done — verification queue, decision workflow, role elevation |
| 5 | Buyer Flow | ✅ Done — phone-OTP signup, search, advisor profile |
| 6 | Founder Dashboard | ✅ Done — 6 tabs, all metrics derived from `project()`, zero hardcoded values |

### Phase 2 — Transactions (✅ complete)
| # | Feature | Status |
|---|---|---|
| 7 | Wallet recharge | ✅ Done — `rechargeWallet`, `WalletLedger`, placeholder `PaymentGateway` |
| 8 | Calls | ✅ Done — `requestCall` (client) + `endCall` (server), atomic billing via `WalletLedger.settleCall` |
| 9 | Reviews | ✅ Done — `submitReview` (server), atomic via `ReviewLedger.submit` |
| 16 | Notifications | ✅ Done — in-app inbox + placeholder push, wired into call completion only |

### Phase 3 — Intelligence (✅ complete)
| # | Feature | Status |
|---|---|---|
| 10 | Marketplace Intelligence | ✅ Done — fixed a latent bug (`liquidityByProject` was always empty), added `advisorConversion` |
| 11 | Buyer + Revenue Intelligence | ✅ Done — surfaced already-computed-but-unrendered metrics |
| 12 | Advisor Intelligence | ✅ Done — `advisorExpertise` surfaced via new `GroupedTags` component |
| 13 | Business Intelligence | ✅ Done — week-over-week trend (`comparePeriod`, `useWeeklyTrend`) |

### Phase 4 — NoDalalTalks Intelligence (🟡 prep only, ~15% of phase scope)
| # | Feature | Status |
|---|---|---|
| 14 | Document AI-readiness | ✅ Done (prep) — `contentHash` (real), `uploadSource`, `ocrStatus`/`aiProcessingStatus` (honest "pending"), `retrievalTags` (unpopulated seam) |
| 15 | System Settings | ✅ Done (prep) — founder-configurable commission/wallet limits, resolves a Feature 8 shortcut |
| — | Demand/supply prediction | ❌ Not started — needs explicit scoping (model, data pipeline, cost) |
| — | Advisor/buyer recommendations | ❌ Not started |
| — | Conversation intelligence | ❌ Not started — needs an LLM API integration decision |

### Post-session fix (unnumbered)
- Fixed: `firestore.rules` required sign-in to read `properties/`, breaking anonymous advisor-profile browsing. Fixed by denormalizing public-safe fields onto `AdvisorProfile`. See [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md).

## Partially Completed Features

1. **Phone-OTP buyer signup** — UI and validation fully work; the `RecaptchaVerifier` fights the fake `demo-` Firebase project (no real reCAPTCHA site key exists for a demo project) and the client-side send-OTP call fails intermittently in the emulator environment even with `appVerificationDisabledForTesting = true` set. The Auth Emulator's own REST API works perfectly when called directly (confirmed). This is an emulator/environment limitation, not an application defect — a real Firebase project would not have this issue.
2. **Founder Dashboard auth gating** — the "Founder access only" screen renders correctly, but `useMetrics()` is called unconditionally before the auth check, so an unauthenticated visit still opens a live Firestore `onSnapshot` listener on `analytics_events` and throws uncaught `permission-denied` errors into the console. Not a crash, but real noise and wasted work. **Not yet fixed.**
3. **Call-not-found vs. call-access-denied** — `/buyer/call/[callId]` shows the same "Call not found" message whether the call genuinely doesn't exist or the viewer just isn't a participant. Cosmetic, not a security issue (the rules correctly deny the read either way).

## Placeholder Features (intentional, documented, swappable)

These are architecturally real (a full port + adapter exists) but the adapter is a stub by design, per the standing brief's "swap the provider without touching business logic" requirement:

| Port | Placeholder adapter | Real adapter planned |
|---|---|---|
| `PaymentGateway` | `PlaceholderPaymentGateway` (auto-captures) | Razorpay / Stripe |
| `CallService` | `PlaceholderCallService` (mints a fake channel, no real audio) | Agora / Twilio |
| `NotificationService` | `ConsoleNotificationService` (logs instead of pushing) | Firebase Cloud Messaging |
| `EmailService` / `SmsService` | Ports defined (Feature 2), **no adapter exists at all yet** | — |

## Missing Features

- **Real landing page** — `/` still shows a "Foundation · Feature 1" developer-status placeholder, not real marketing content, despite a "Landing Website" prototype being listed in the original approved-designs set.
- **Advisor-facing app** — advisors can onboard, but there is no advisor dashboard: no call history, no earnings view, no way to see/respond to their own notifications, no incoming-call UI. Everything advisor-side after onboarding is server-side only (they get notified server-side, but there's no page to read it).
- **Staff login UI** — verifiers/founders/admins authenticate via `signInWithEmail` (the port exists, `FirebaseAuthService.signInWithEmail` is implemented), but **no login page or form calls it**. Staff access today can only be exercised by directly minting tokens/sessions outside the app (as this session's verification work did).
- **Cloud Functions** — none exist. All "server-side" logic (wallet, calls, reviews, admin role-setting) runs in Next.js API routes with the Admin SDK, which works but doesn't scale the same way and doesn't run `project()` server-side yet (still recomputed client-side on every dashboard load).
- **Real AI** — see Phase 4 above.
- **Referral system** — event taxonomy has `REFERRAL_SENT`/`REFERRAL_CONVERTED` and the Founder Dashboard has a `kFactor`/`referralsConverted` metric, but nothing emits these events; no referral UI or use case exists.
- **`builders` / `projects` reference-data collections** — rules exist (public read, admin write) but nothing reads or writes them; the app currently free-texts project/builder names rather than referencing a canonical list.

## Known Bugs

1. **Founder Dashboard listener-before-gate** (see above) — open, not fixed.
2. **Phone-OTP flakiness against fake demo Firebase projects** — environment limitation, would not reproduce against a real Firebase project.
3. **"Call not found" message conflates 404 and 403** — cosmetic.

## Technical Debt

- **`project()` recomputes the entire event log on every dashboard load, client-side.** Fine at current data volumes; will need to move server-side (Cloud Function → `metrics_daily` read-model) before it doesn't. The architecture already anticipates this (see [ARCHITECTURE.md](./ARCHITECTURE.md) "MVP → scale, with no rewrite" table) — it's a planned migration, not a design flaw.
- **No pagination** on `listActive`, `listByAdvisor`, `listRecentByBuyer`, etc. — all capped with a `max` parameter (e.g. 25, 50) but no cursor-based paging.
- **No caching layer** (Redis or similar) — every read hits Firestore directly.
- **`EmailService`/`SmsService` have zero adapters** — ports exist, nothing implements them.
- **Advisor onboarding rate bounds (₹30–₹120/min) are a UI-only constant** (`RATE_MIN`/`RATE_MAX` in `options.ts`), not enforced server-side in `submitAdvisorApplication` — a malicious client could submit outside this range.
- **`purchasePriceBucket` vs `pricePaidPaise`** — the `Property` entity has both a rough bucket (collected today) and a precise-paise field (schema exists, form doesn't collect it) — half-migrated intelligence field.

---

## Folder Structure

```
nodalaltalks/
├── src/
│   ├── core/                        ← PURE. No Firebase/Next/React imports allowed.
│   │   ├── domain/
│   │   │   ├── entities/            ← User, AdvisorProfile, Property, VerificationDocument,
│   │   │   │                          Call, Wallet, Transaction, Review, Notification, SystemSettings
│   │   │   ├── events/              ← event-names.ts (taxonomy), event.types.ts (envelope),
│   │   │   │                          event-factory.ts (createEvent, the ONLY constructor)
│   │   │   └── value-objects/       ← money.ts (paise/rupees), role.ts, commission.ts
│   │   └── application/
│   │       ├── ports/               ← every interface: AuthService, StorageService, PaymentGateway,
│   │       │                          CallService, NotificationService, WalletLedger, ReviewLedger,
│   │       │                          SystemSettingsRepository, *Repository interfaces, HashService
│   │       ├── use-cases/           ← registerBuyer, submitAdvisorApplication, verification.ts
│   │       │                          (4 functions), recharge-wallet, calls.ts (3 functions),
│   │       │                          submit-review
│   │       ├── events/              ← create-emitter.ts (shared event-envelope builder)
│   │       └── projections/         ← project.ts (THE reducer), trend.ts, metrics.types.ts
│   ├── infrastructure/               ← Adapters. Implements ports. Firebase-aware.
│   │   ├── firebase/                 ← client.ts, admin.ts, collections.ts, env.ts, doc-helpers.ts
│   │   ├── auth/                     ← FirebaseAuthService, HttpRoleClaimService
│   │   ├── repositories/             ← one Firestore adapter per collection (Firestore* for client,
│   │   │                                Admin* for server-only)
│   │   ├── events/                   ← InMemory/Firestore/Admin EventRepository + factory
│   │   ├── payments/, calling/, notifications/  ← placeholder adapters
│   │   ├── storage/                  ← FirebaseStorageService
│   │   ├── system/                   ← Clock, IdGenerator, SessionProvider, RuntimeContext, HashService
│   │   ├── composition.ts            ← CLIENT composition root (builds deps for every client use case)
│   │   └── server-composition.ts     ← SERVER composition root (Admin SDK adapters only)
│   ├── presentation/
│   │   ├── features/                 ← one folder per feature area: buyer, advisor-onboarding,
│   │   │                                verification, wallet, calls, reviews, notifications, founder
│   │   ├── components/ui/            ← shared dumb components: Button, Field, Input, Stepper,
│   │   │                                UploadBox, metrics.tsx (StatTile/BarList/Funnel/Panel/GroupedTags)
│   │   ├── providers/                ← AuthProvider, QueryProvider
│   │   └── analytics/                ← use-track.ts (the React track() hook)
│   ├── app/                          ← Next.js App Router: pages + API routes (see API_REFERENCE.md)
│   └── lib/                          ← validations/ (Zod schemas), utils.ts
├── firestore.rules, storage.rules, firestore.indexes.json, firebase.json, .firebaserc
├── ARCHITECTURE.md, README.md         ← pre-existing, still authoritative for the event-sourcing story
├── COMPLETE_PROJECT_STATE.md, PROJECT_HANDOVER.md, DATABASE.md, API_REFERENCE.md,
│   ROADMAP.md, AI_ROADMAP.md, ENGINEERING_DECISIONS.md   ← this handover set
└── package.json
```

## Tech Stack (exact versions in `package.json`)

- **Frontend**: Next.js 15.3, React 19.1, TypeScript 5.7, Tailwind CSS 3.4, React Hook Form 7.54 + Zod 3.24, TanStack Query 5.66
- **Backend**: Firebase JS SDK 11.3 (client), firebase-admin 13.1 (server)
- **Testing**: Vitest 3.0
- **Dev tooling**: firebase-tools 15.22 (emulator suite — added this session)
- **No Cloud Functions runtime yet** — no `functions/` directory exists

## What Should the Next Claude Code Session Do First?

See [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) for the full onboarding sequence. In priority order:

1. **Fix the Founder Dashboard listener-before-gate bug** (small, well-understood, already diagnosed above).
2. **Resume live end-to-end verification**: phone-OTP signup → advisor onboarding submission → verifier activates → buyer recharges wallet → buyer calls advisor → call ends and bills correctly → buyer reviews → Founder Dashboard reflects all of it. Most of this was individually verified via unit tests and partial live checks this session; nothing has been click-tested as one continuous real flow.
3. **Build a staff login page** — `signInWithEmail` exists and is unused; verifiers/founders currently have no way to sign in through the actual UI.
4. Then pick up [ROADMAP.md](./ROADMAP.md)'s prioritized backlog.
