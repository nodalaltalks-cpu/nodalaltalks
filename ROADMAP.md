# Roadmap

For current implementation status, see [COMPLETE_PROJECT_STATE.md](./COMPLETE_PROJECT_STATE.md). This document is forward-looking only.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Auth, Firestore, Storage, Advisor Onboarding, Buyer Flow, Documents Dashboard, Founder Dashboard | ✅ Complete |
| **Phase 2** | Wallet, Booking (folded into Calls), Calls, Reviews, Notifications | ✅ Complete |
| **Phase 3** | Marketplace / Buyer+Revenue / Advisor / Business Intelligence | ✅ Complete |
| **Phase 4** | NoDalalTalks Intelligence (AI-powered) | 🟡 Architecture prep only (~15%) — see [AI_ROADMAP.md](./AI_ROADMAP.md) |

## Immediate next tasks, in priority order

These are scoped, well-understood, and don't require a new product decision — pick up in this order:

1. **Fix: Founder Dashboard fires a live Firestore listener before checking the auth gate.** `useMetrics()`/`useWeeklyTrend()` in `FounderDashboard.tsx` run unconditionally; gate them behind the `isAdminRole` check so an unauthorized visitor never opens an `onSnapshot` on `analytics_events`. Small, isolated, already diagnosed.
2. **Build the staff login page.** `AuthService.signInWithEmail` exists and works; no UI calls it. Verifiers and founders cannot access their own dashboards today without out-of-band token injection. This blocks real usage of two of the six Phase 1 features.
3. **Resume live, end-to-end flow verification** against the Firebase Emulator Suite: full buyer signup (phone OTP) → advisor onboarding → verifier activation → wallet recharge → call → review → Founder Dashboard reflecting it all, as one continuous session. Individually unit-tested; never click-tested as one flow.
4. **Replace the landing page** (`src/app/page.tsx`) — currently a "Feature 1" developer placeholder. A "Landing Website" prototype is referenced in the original design brief as already-approved; find or recreate it rather than redesigning from scratch.
5. **Enforce advisor rate bounds server-side.** `RATE_MIN`/`RATE_MAX` (₹30–₹120/min) are a UI-only constant; `submitAdvisorApplication` doesn't validate `ratePerMinPaise` against them. Low effort, closes a real input-validation gap.
6. **Build an advisor-facing dashboard.** Advisors currently have zero visibility into their own call history, earnings, or notifications after onboarding. This is a real product gap, not just a nice-to-have — advisors are the supply side of the marketplace and currently fly blind.

## Medium-term (before a real launch)

- **Move `project()` server-side.** Currently the Founder Dashboard replays the *entire* event log in the browser on every load. The architecture already anticipates this (see ARCHITECTURE.md's "MVP → scale" table): add a Cloud Function triggered on `analytics_events` writes that maintains a `metrics_daily` read-model, and point `useMetrics` at that instead. No change to `project()` itself or any dashboard component.
- **Real payment provider.** Swap `PlaceholderPaymentGateway` for Razorpay (India-first) via the existing `PaymentGateway` port — zero changes to `rechargeWallet` or the recharge API route.
- **Real calling provider.** Swap `PlaceholderCallService` for Agora or Twilio via the existing `CallService` port. This also unblocks real call recording (`recordings/{callId}` storage path and rules already exist, unused).
- **Real push notifications.** Implement `NotificationService` with Firebase Cloud Messaging; `EmailService`/`SmsService` have ports but zero adapters — pick a provider (SendGrid/Twilio) when email/SMS notifications are actually needed.
- **Pagination.** Every list read (`listActive`, `listByAdvisor`, `listRecentByBuyer`, `listByUser`) is capped with a `max` param but has no cursor-based paging — fine at low volume, will need fixing before any collection exceeds a few hundred docs per query shape.
- **Reference-data collections.** `builders/` and `projects/` have rules but no implementation — currently every advisor free-texts their builder/project name, meaning "Lodha Group" and "lodha group" are different demand buckets in the Marketplace Intelligence dashboard. Canonicalizing this meaningfully improves every Phase 3 metric.
- **Referral system.** Event taxonomy and Founder Dashboard metrics (`kFactor`, `referralsConverted`) already exist; nothing emits the underlying events or has a referral UI/use case.

## Scalability strategy (for when the marketplace has real volume)

The event-sourcing architecture is the core scalability lever and is already in place:

1. **Today**: `project()` runs client-side over the full log — correct, simple, but O(total events) per dashboard load.
2. **Next**: move `project()` into a Cloud Function that runs incrementally on each `analytics_events` write, maintaining `metrics_daily`/`metrics_realtime` read-models. Dashboards subscribe to the small read-model, not the full log. **No application-layer code changes** — `project()` is already pure and portable.
3. **Later**: if `analytics_events` itself grows too large for a single collection's practical query patterns, consider sharding by time period (`analytics_events_2027_01`) with the same envelope shape — the append-only, never-mutated nature of the log makes this safe to do without a data migration, only a routing change in the repository adapter.
4. **Firestore read/write cost discipline**: every existing repository already minimizes reads (single-doc gets keyed by ID where possible, capped list queries). As volume grows, introduce a caching layer (Redis or Firestore's own bundle/cache features) in front of read-heavy, slow-changing data (active advisor list, system settings) rather than changing the ports — this is an adapter-level change.
5. **Multi-region / multi-country**: the domain model already avoids hardcoding currency (paise is India-specific but isolated to `money.ts`) or single-locale assumptions in the event schema (`environment`, `platform`, `source` are already free-form strings, not closed enums, specifically so new deployment targets don't require a schema change). Real multi-country support would need: a currency field on `Wallet`/`Transaction`/`Call` (currently implicitly INR), and locale-aware formatting pulled out of `money.ts` into a proper i18n layer.

## IPO-scale considerations (long-horizon, not near-term work)

- **Auditability**: the brief's original principle — Business Data → Analytics → Audit Trail must remain three separate concerns — is only two-thirds implemented. `analytics_events` (business/analytics) and the read-models exist; `activity_logs` (pure audit trail, e.g. "verifier X approved document Y at time Z, from IP W") has rules but zero implementation. A pre-IPO audit would likely require this.
- **Data residency / compliance**: no data-residency controls exist yet (single Firestore region, implicit). Real financial/PII compliance work (RBI guidelines for wallet-like prepaid instruments, KYC document retention policy, GDPR-equivalent data-subject rights) has not been scoped at all — this is a legal/compliance workstream, not an engineering one, but engineering needs to be looped in early.
- **Financial reconciliation**: `transactions` is append-only and atomic per-write, which is a solid foundation, but there is no reconciliation job (e.g., nightly job verifying every wallet's `balancePaise` equals the sum of its transactions) — worth adding well before real money volume makes a silent bug expensive.
- **Observability**: no structured logging, tracing, or alerting exists beyond `console.log`/Next.js dev server output. The original brief calls for correlation IDs and performance timing on every backend service — none of that exists yet.

## Pending milestones (from the original founding brief, not yet started)

- Feature flags (the brief explicitly calls for flag-gating Wallet/Calls/Reviews/AI/Referral/Notifications/Premium/Admin so features can ship dark and roll out without a deploy). **Not implemented anywhere.**
- Multi-language / multi-currency support (see "Scalability strategy" above).
- A dedicated "Intelligence Dashboard" as a distinct surface from the Founder Dashboard — the original brief listed these as separate approved prototypes; this codebase merged Phase 3's intelligence work into the existing Founder Dashboard's tabs rather than building a second surface. This was a reasonable prior decision (see [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md)) but is worth revisiting if the Founder Dashboard becomes too dense.
