# NEXT_SESSION.md — Start Here

**Written:** 2026-07-05, at the end of the session that built Features 7–16, the handover doc set, and the live app audit.
**Audience:** a brand-new Claude Code session (or human engineer) with zero prior chat history.
**Rule #1 of this document: read it fully before writing any code.**

---

## 1. Current project status

NoDalalTalks is a buyer-to-buyer real estate consultation marketplace (India). Buyers pay per minute to talk to verified existing owners of the property they're evaluating. The codebase is a production-grade Next.js 15 + Firebase app built on strict Clean Architecture with an append-only event log (`analytics_events`) as the single source of dashboard truth.

- **Phase 1 (Foundation) — complete.** Auth, Firestore, Storage, Advisor Onboarding, Buyer Flow, Documents Dashboard, Founder Dashboard.
- **Phase 2 (Transactions) — complete.** Wallet, Calls, Reviews, Notifications.
- **Phase 3 (Intelligence) — complete.** Marketplace / Buyer+Revenue / Advisor / Business Intelligence, all as derived metrics on the Founder Dashboard.
- **Phase 4 (AI) — deliberately unscoped.** Only architecture prep exists (Features 14–15). Do not start AI work without an explicit product decision — see [AI_ROADMAP.md](./AI_ROADMAP.md).

Last commit: `b1208ae` — "Fix: signed-out buyers couldn't view advisor profiles".
Test suite: **42/42 passing.** `npm run typecheck`, `npm run lint`, `npm run build` all clean.

## 2. What has been completed

Sixteen numbered features (see README.md "Build status" — it is the living changelog and matches `git log`). Every feature: implemented, unit-tested where logic warranted it, committed with a descriptive message, and recorded in the README. Additionally this session: the Firebase Local Emulator Suite was made to actually run on this machine (JDK 21 installed at `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot`, `firebase-tools` added as a dev dependency), two real Security-Rules bugs were found via live testing (one fixed and committed, one still open — see §5), and a full 8-document handover set plus a live app audit were written.

## 3. What has been tested

Three distinct tiers — do not conflate them:

1. **Unit-tested (42 tests, all passing):** all `src/core` use cases and projections — billing math, commission splits, review aggregation, event emission, wallet credit/debit, verification workflow, the `project()` reducer, trend comparison, SHA-256 hashing.
2. **Live-verified against the Firebase Emulator Suite (browser, real Firestore reads/writes):** `/buyer` search with real data; `/buyer/advisor/[id]` as a signed-out visitor (confirming the properties-rules fix); `/advisor/onboarding` step-1 rendering; all auth gates (`/buyer/wallet`, `/buyer/notifications`, `/founder`, `/founder/settings`, `/verifier/documents`, `/buyer/call/[id]`) behave correctly for signed-out visitors.
3. **NOT yet tested live, end-to-end:** the complete authenticated journey (signup → onboard → verify → recharge → call → review → dashboard). Blocked by two things: phone-OTP is flaky against the fake `demo-` emulator project (environment-specific, not an app bug), and **there is no staff login UI at all** (see §5).

Full page-by-page detail: [APP_AUDIT.md](./APP_AUDIT.md).

## 4. What is production ready

- `/buyer` (advisor search) and `/buyer/advisor/[id]` (profile) — ready at current scale.
- The entire `src/core` layer — pure, tested, framework-free.
- Firestore/Storage Security Rules — well-designed, though treat any change to them as a security review.
- The event log + `project()` metrics pipeline — correct and tested; the client-side-replay approach is fine until data volume grows (migration path already designed, see ARCHITECTURE.md).

**Not production ready:** everything involving real money (placeholder payment gateway), real audio (placeholder call service), real push (console notification service), the landing page (dev placeholder), and anything requiring staff sign-in (no login UI exists).

## 5. What is blocked

| Blocker | What it blocks | Nature |
|---|---|---|
| **No staff login page** — `AuthService.signInWithEmail` is implemented but no UI calls it | `/verifier/documents` (⇒ no advisor can ever be activated ⇒ no marketplace supply), `/founder`, `/founder/settings` | **Pure engineering gap — nothing external needed. Fix first.** |
| Phone-OTP flakiness in emulator | Live e2e verification of the buyer funnel | Environment-only (fake `demo-` project has no reCAPTCHA site key). Needs a **real Firebase project** (free Spark tier works; phone auth has a free daily quota) to fully verify. |
| Founder Dashboard fires a Firestore listener before its auth check | Console `permission-denied` spam for every unauthorized visitor to `/founder` | Small known bug, diagnosed, fix is scoped (gate `useMetrics`/`useWeeklyTrend` behind the role check). |
| Placeholder payment gateway | Real money | Paid third-party (Razorpay/Stripe). Postpone. |
| Placeholder call service | Real audio calls — the core product mechanic | Paid third-party (Agora/Twilio). Postpone. |

## 6. Highest-priority tasks, in exact order

1. **Fix the Founder Dashboard listener-before-gate bug** (`src/presentation/features/founder/FounderDashboard.tsx` — `useMetrics()`/`useWeeklyTrend()` run before the `isAdminRole` check). Small, isolated, already diagnosed.
2. **Build the staff login page** (email/password via the existing `AuthService.signInWithEmail`). Unblocks three pages and the entire advisor-supply pipeline. Suggested route: `/staff/login` or `/login`.
3. **Enforce advisor rate bounds server-side** in `submitAdvisorApplication` (₹30–₹120/min currently UI-only).
4. **Live end-to-end verification** of the full journey against the emulator (staff parts now possible after #2; buyer OTP parts against a real Firebase project when available).
5. **Replace the landing page** (`src/app/page.tsx`) — currently a "Feature 1" dev banner. The original brief references an approved "Landing Website" prototype; ask the founder for it rather than redesigning.
6. **Advisor dashboard** (call history, earnings, notifications) — advisors currently fly blind after onboarding.
7. Then: [ROADMAP.md](./ROADMAP.md) medium-term items (server-side `project()`, pagination, reference-data collections, referrals).

## 7. Tasks requiring paid third-party services — POSTPONE these

| Task | Service | Cost trigger |
|---|---|---|
| Real audio calls + recording | Agora or Twilio | Per-minute usage fees; recording storage |
| Real payments | Razorpay (India-first) or Stripe | Transaction fees; KYC/business onboarding |
| Real SMS OTP at scale | Firebase phone auth beyond free tier / dedicated SMS provider | Per-SMS fees (small free daily quota exists on Firebase) |
| Real push notifications | Firebase Cloud Messaging | Free, but only worth wiring once there's a real user base — postpone as low-value, not costly |
| Email notifications | SendGrid or similar | Free tiers exist; no adapter exists yet either way |

**All of these are behind ports (`PaymentGateway`, `CallService`, `NotificationService`)** — when the subscriptions are eventually purchased, each is an adapter swap with zero changes to business logic. Do not restructure anything in anticipation.

## 8. Tasks that can continue with NO paid subscriptions

Everything in §6. Specifically: the listener-gate fix, staff login page, server-side rate validation, the landing page, the advisor dashboard, pagination, server-side `project()` via emulated Cloud Functions, reference-data (`builders`/`projects`) collections, the referral system, and all emulator-based testing. A free-tier (Spark) Firebase project also unblocks real phone-OTP verification at small scale for free.

## 9. Current Git workflow

- **Branches:** `main` and `develop`, both currently at the same commit (`b1208ae`), with remotes on GitHub (`origin` → `github.com/nodalaltalks-cpu/nodalaltalks`). **Current checkout: `develop`.**
- **Convention going forward:** work on `develop`, merge to `main` at stable milestones. (Note: history to date was committed directly to `main` before `develop` existed — that's fine, don't rewrite it.)
- **Commit style:** one feature per commit, descriptive multi-paragraph messages that state what was verified and how (read `git log` for examples — the honesty about verification status in those messages is a deliberate convention, keep it).
- **Uncommitted right now:** the 9 handover/audit markdown docs (`ARCHITECTURE.md` modified + 8 new). **First action of the next session: commit these docs** — they are the handover itself and must not be lost.
- `.claude/` (local tool config) stays untracked. `firebase-debug.log`/`firestore-debug.log` are gitignored.

## 10. Read these documents BEFORE touching code, in this order

1. **This file** (NEXT_SESSION.md).
2. [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) — how to run everything locally (emulator setup, env vars, seeding, known gotchas), team conventions.
3. [COMPLETE_PROJECT_STATE.md](./COMPLETE_PROJECT_STATE.md) — full feature-by-feature status, known bugs, technical debt, executive summary scores.
4. [ARCHITECTURE.md](./ARCHITECTURE.md) — Clean Architecture layers, the event-sourcing model, every port. **The dependency rules in here are non-negotiable.**
5. [APP_AUDIT.md](./APP_AUDIT.md) — live page-by-page audit with beta-launch priority ranking.
6. As needed: [DATABASE.md](./DATABASE.md) (before touching any Firestore collection or rule), [API_REFERENCE.md](./API_REFERENCE.md) (before adding routes/use cases/hooks), [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md) (before "improving" anything that looks odd — it is probably deliberate), [ROADMAP.md](./ROADMAP.md) + [AI_ROADMAP.md](./AI_ROADMAP.md) (before planning new work).

Also: README.md's "Build status" section is the living changelog — update it when you ship a feature.

## 11. Rules for future development

1. **Never refactor working code without a driving requirement.** Especially: do not "clean up" the placeholder adapters, the paise-based money math, the event envelope, or anything documented in ENGINEERING_DECISIONS.md. If something looks strange, check that file first — every strange-looking thing so far has been deliberate.
2. **`src/core` never imports Firebase, Next, or React.** No exceptions. New external capability ⇒ new port, defined next to its first real consumer — never speculatively.
3. **Always test before committing:** `npm run typecheck && npm run lint && npm test && npm run build` must all pass. This has been true for every commit to date; keep the streak.
4. **Commit by milestone:** one coherent feature/fix per commit, descriptive message, state honestly what was and wasn't verified (unit tests vs. live emulator vs. not at all). Update README.md's changelog in the same or an adjacent commit.
5. **Money and role-protected aggregates are server-only**, via a `*Ledger` port + Admin-SDK adapter, atomic in one Firestore transaction. Clients never write them.
6. **Never hardcode a dashboard value** — extend `project()`. And before writing a new projection, grep `metrics.types.ts` against `FounderDashboard.tsx`: three past features turned out to be "surface an already-computed field."
7. **Any Security Rules change is a security review.** Live-test affected pages against the emulator — two real rules bugs were only ever found this way, never by unit tests.
8. **No AI work without explicit scoping.** See AI_ROADMAP.md for why and what "scoped" means.
9. **Never rename or repurpose an existing event verb** in `event-names.ts` — the log is append-only history.
10. **Delete throwaway scripts** (seeding, token-minting) before committing; don't ship session tooling.

## 12. Exact first prompt for the next Claude Code session

> Read NEXT_SESSION.md in the repo root, then PROJECT_HANDOVER.md and COMPLETE_PROJECT_STATE.md. Do not write any code until you've read all three.
>
> Then, in order:
> 1. Commit the 9 uncommitted handover/audit markdown documents (ARCHITECTURE.md + 8 new .md files) with the message "docs: complete engineering handover set".
> 2. Fix the Founder Dashboard bug where `useMetrics()`/`useWeeklyTrend()` open a Firestore listener before the `isAdminRole` auth check (details in APP_AUDIT.md §9 and NEXT_SESSION.md §6.1). Verify the fix live against the Firebase Emulator Suite per PROJECT_HANDOVER.md's setup instructions — confirm the console `permission-denied` errors are gone for a signed-out visitor to /founder.
> 3. Build the staff login page using the existing `AuthService.signInWithEmail` (NEXT_SESSION.md §6.2) — this unblocks the verifier and founder dashboards. Verify live by signing in as a seeded verifier and founder against the emulator.
>
> Follow the development rules in NEXT_SESSION.md §11. Run typecheck, lint, test, and build before every commit. Do not start any Phase 4 / AI work.
