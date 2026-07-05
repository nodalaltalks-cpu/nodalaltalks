# Engineering Decisions

A chronological log of the non-obvious decisions made on this codebase and the reasoning behind them — so a future engineer doesn't have to reverse-engineer *why* something looks the way it does, or accidentally undo a deliberate choice.

---

## Event sourcing as the single source of dashboard truth
**Decision**: every dashboard number is derived by `project()`, a pure reducer over the append-only `analytics_events` log. No dashboard collection stores a precomputed value.
**Why**: matches the original founding brief's explicit requirement ("no hardcoded dashboard values") and the Stripe/ledger pattern — immutable events as truth, everything else as a cache. It also means the *entire* metrics layer is unit-testable without touching Firestore (feed `project()` a fixed array of events, assert the output).
**Trade-off accepted**: `project()` replays the whole log on every load today (see ROADMAP.md's scalability section) — accepted deliberately as an MVP cost, with the migration path (Cloud Function → `metrics_daily`) already designed into the reducer's pure/stateless shape.

## Ports/adapters for every external dependency, defined next to the first real consumer
**Decision**: `PaymentGateway`, `CallService`, `NotificationService`, `HashService`, `WalletLedger`, `ReviewLedger`, `SystemSettingsRepository` — every external or privileged capability is an interface in `core/application/ports`, implemented by a swappable adapter in `infrastructure`.
**Why**: lets the business logic (`recharge-wallet.ts`, `calls.ts`, etc.) be tested with fakes and lets a real provider (Razorpay, Agora, FCM) drop in later with zero changes to any use case.
**Explicit rule, re-confirmed multiple times**: define the port when the first real caller needs it, not in advance. An `AIInsightsService` port was explicitly *not* added during Phase 4 prep, despite Phase 4 being "on the roadmap," because nothing calls it yet — see [AI_ROADMAP.md](./AI_ROADMAP.md).

## Anything touching a Security-Rules-protected aggregate is server-only, via a `*Ledger` port
**Decision**: `WalletLedger` (wallet balance) and `ReviewLedger` (advisor rating aggregate) are Admin-SDK-only, and do their write in a single Firestore transaction alongside the record that justifies it (a transaction alongside a balance change; a review alongside the rating recompute).
**Why**: Firestore Security Rules can restrict a *field* only via `unchanged()` checks on direct writes — they cannot compute a rolling average or a debit safely from client-supplied data. The pattern generalizes: "if a write needs to read-then-write atomically against rules a client can't be trusted to enforce, it's a `*Ledger` port, server-only."
**Precedent this created**: when Notifications (Feature 16) needed to write `notifications/*`, the same shape was reused (`NotificationRepository` with an Admin-only `create`), even though notifications aren't money — because Security Rules already marked that collection server-write-only.

## Event envelope versioning added project-wide, pre-launch
**Decision**: `AnalyticsEvent` gained `eventVersion`, `schemaVersion`, `source`, `platform`, `environment` fields, stamped by a single shared `createEventEmitter()` helper (added at the same time to de-duplicate five near-identical envelope-building closures across use cases).
**Why now, not later**: this was a genuine architecture trade-off — retrofitting the event envelope after real production data exists is expensive (mixed-schema history forever); doing it pre-launch (no real events exist yet) is a type-level change with no backfill. The "is this pre-launch and therefore cheap" question is a reusable heuristic for similar future schema decisions.
**What was explicitly NOT done at the same time**: full lifecycle/audit fields (`createdBy`, `deletedAt`, etc.) were not retrofitted onto Features 1–6's existing entities — only added to entities actively being touched (Wallet, Transaction, Call, Review, Document, SystemSettings each got `schemaVersion` and, where relevant, `status`/`version`/`metadata`). A full retrofit remains undone; see ROADMAP.md.

## Advisor-profile browsing must not require sign-in, but `properties/` must
**Decision** (a bug fix, not a new feature): `firestore.rules` requires `isSignedIn()` to read `properties/` because that collection holds `homeLoan` (and a reserved `pricePaidPaise` field), both explicitly private. But anonymous buyers browsing before signup is core to the product's pitch. Fix: denormalize the public-safe subset (`project`, `builder`, `city`, `expertise`) onto `advisor_profiles` at submission time; treat `properties` as enrichment-only in `useAdvisorProfile` (`Promise.allSettled`, not `Promise.all`, so a permission-denied there doesn't fail the whole profile load).
**Why this shape, not "just make properties public"**: Firestore Security Rules are document-level, not field-level — there is no way to expose `project`/`builder` while hiding `homeLoan` within the *same* document via rules alone. Denormalization is the correct fix given that constraint, not a workaround.
**How this was found**: live testing against the Firebase Emulator Suite with seeded data — not caught by typecheck, lint, or the unit test suite, because the bug was in the interaction between Security Rules and a client read pattern, which none of those tools evaluate.

## Commission rate and wallet limits moved to `system_settings/global`, not hardcoded
**Decision**: `PLATFORM_COMMISSION_RATE` (was a hardcoded constant in `commission.ts`) and the wallet recharge min/max (was hardcoded in the recharge API route) are now read from a Firestore singleton, founder-editable via `/founder/settings`, with a safe in-code default (`DEFAULT_SYSTEM_SETTINGS`) so nothing breaks before the doc exists.
**Why**: directly resolves a shortcut explicitly flagged in an earlier commit message ("hardcoded because system_settings doesn't exist yet — isolated so wiring it up later is a one-file change"). Matches the founding brief's explicit "never hardcode... commission %... wallet limits" instruction.
**Scope boundary respected**: the *buyer-facing* wallet UI's client-side input bounds were deliberately left hardcoded as a UX hint — fixing that would mean adding a settings fetch to a page every buyer visits, for a cosmetic mismatch (the server route is authoritative regardless).

## Intelligence work: audit before building
**Decision/pattern**: three consecutive Phase 3 features (Marketplace, Buyer+Revenue, Advisor Intelligence) turned out to be mostly "surface an already-computed-but-unrendered `Metrics` field" rather than new reducer logic — discovered by diffing `metrics.types.ts` field names against what `FounderDashboard.tsx` actually renders.
**Why this matters going forward**: before writing a new projection in `project()`, run that diff first. This codebase has repeatedly had more computed-but-unsurfaced intelligence than expected; assume that pattern continues until proven otherwise for any new Phase 3/4-adjacent work.

## No speculative AI ports
**Decision**: despite Phase 4 being named and scoped in the founding brief, no `AIInsightsService`-style port, no AI SDK dependency, and no AI-specific Cloud Function exist.
**Why**: this was an explicit, repeated choice (asked and confirmed twice at different points) to stay in "architecture prep" mode rather than default into building a specific AI capability without a real scoping conversation about model/provider/cost/data-residency. See [AI_ROADMAP.md](./AI_ROADMAP.md) for what *was* prepared instead (document metadata fields, the event log's versioning) and why that's different from building unused interfaces.

## Bootstrapping the first staff account
**Decision/constraint**: `/api/admin/set-role` requires the caller to already be staff, by design (prevents a buyer from self-granting `founder`). This means the **first ever** founder/admin account cannot be created through the app itself.
**How it's actually done today**: directly via the Firebase Admin SDK (`auth.setCustomUserClaims(uid, { role: "founder" })`), run as a one-off script against either the emulator or a real project with service-account credentials — not through any app code path. This is standard practice for this kind of bootstrap problem, not a gap to fix.

## Firebase emulator testing required a documented workaround
**Decision**: `client.ts` sets `auth.settings.appVerificationDisabledForTesting = true` inside the existing `shouldUseEmulators()` branch.
**Why**: `RecaptchaVerifier` tries to load Google's real reCAPTCHA Enterprise config by default, which cannot succeed against a fake `demo-` project (no registered site key — this is true for *any* team using a demo project, not specific to this codebase). This is Firebase's own documented fix, gated identically to `connectAuthEmulator`, with zero effect outside emulator mode.
**Residual limitation, not fully resolved**: even with this flag set, this session still observed intermittent failures completing the phone-OTP flow through the browser SDK against the emulator (the Auth Emulator's own REST API works reliably when called directly, proving the emulator itself is fine — the friction is specifically in the JS SDK's client-side reCAPTCHA fallback logic). Documented in [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) as a known environment quirk, not chased further because it doesn't reproduce against a real Firebase project.
