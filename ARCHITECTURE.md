# Architecture

NoDalalTalks is built with **Clean Architecture** on top of Next.js 15 and
Firebase. The guiding rule is the dependency rule: **dependencies point inward,
toward the domain.** The domain knows nothing about Firebase, Razorpay, Agora,
React, or Next.

```
            ┌─────────────────────────────────────────────┐
            │                presentation                 │  Next.js routes, shadcn
            │      (depends on application via hooks)      │  components, RHF forms
            └───────────────────────┬─────────────────────┘
                                    │
            ┌───────────────────────▼─────────────────────┐
            │                application                  │  use cases, ports
            │   project() reducer · port INTERFACES only   │  (no implementations)
            └───────────────────────┬─────────────────────┘
                                    │
            ┌───────────────────────▼─────────────────────┐
            │                  domain                     │  entities, value objects,
            │     events (taxonomy, envelope, factory)     │  THE event log contract
            └─────────────────────────────────────────────┘
                                    ▲
            ┌───────────────────────┴─────────────────────┐
            │              infrastructure                 │  Firestore/Auth/Storage,
            │     adapters that IMPLEMENT the ports        │  Razorpay/Stripe, Agora…
            └─────────────────────────────────────────────┘
```

`infrastructure` and `presentation` are the outer ring; they depend on
`application` + `domain`. The inner rings never import outward. This is what
lets us swap Firebase, payment providers, or the calling SDK without touching
business logic.

## Folder structure

```
src/
  core/                        PURE — no Firebase/Next/React imports, anywhere
    domain/
      entities/                User, AdvisorProfile, Property, VerificationDocument,
                                Call, Wallet, Transaction, Review, Notification,
                                SystemSettings — plain interfaces + status enums
      events/                  event-names.ts (the taxonomy, ~40 verbs)
                                event.types.ts (the envelope shape)
                                event-factory.ts (createEvent — the ONLY constructor)
      value-objects/           money.ts (paise↔rupees), role.ts, commission.ts
    application/
      ports/                   every interface a use case depends on
      use-cases/                registerBuyer, submitAdvisorApplication,
                                verification.ts, recharge-wallet, calls.ts,
                                submit-review — pure orchestration over ports
      events/                  create-emitter.ts — the ONE shared event-envelope
                                builder every use case calls, instead of each
                                hand-rolling id/ts/session/runtime wiring
      projections/             project.ts (THE reducer), trend.ts, metrics.types.ts
  infrastructure/               adapters — Firebase-aware, implements ports
    firebase/                  client.ts (browser SDK + emulator wiring),
                                admin.ts (Admin SDK), collections.ts, env.ts
    auth/, repositories/, events/, payments/, calling/, notifications/, storage/, system/
    composition.ts             CLIENT composition root
    server-composition.ts      SERVER composition root (Admin SDK only — never
                                imported by a client component)
  presentation/
    features/                  one folder per feature area (buyer, calls, wallet, …)
    components/ui/             shared, business-logic-free display primitives
    providers/                 AuthProvider, QueryProvider
    analytics/                 use-track.ts — the React track() hook
  app/                         Next.js App Router: pages (grouped by role) + API routes
  lib/                         Zod validation schemas, misc utils
```

## Tech stack

- **Frontend:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui-style primitives · React Hook Form · Zod · TanStack Query
- **Backend:** Firebase Auth · Cloud Firestore · Cloud Storage · (Cloud Functions not yet used — see below)
- **Payments:** swappable behind a `PaymentGateway` port (placeholder today; Razorpay / Stripe later)
- **Calling:** swappable behind a `CallService` port (placeholder today; Agora / Twilio later)
- **Notifications:** swappable behind `NotificationService`/`EmailService`/`SmsService` ports (console-log placeholder for push; email/SMS have ports but no adapter yet)
- **Testing:** Vitest — `src/core` runs in Node (pure TS, no DOM needed); a few infrastructure adapters (hash service, in-memory event repo) are tested too

## Frontend architecture

- **App Router, grouped by role**: `(buyer)`, `(advisor)`, `(founder)`, `(verifier)` route groups under `src/app/`, each rendering a `presentation/features/<area>` component. Pages are thin — they extract route params and render a feature component; all logic lives in the feature layer.
- **Data fetching**: TanStack Query hooks per feature (`useAdvisorProfile`, `useWallet`, `useMetrics`, etc.), each calling a composition-root builder (`buildXDeps()`) that wires concrete Firestore adapters behind the ports the use case/query needs. Components never import Firebase directly.
- **Forms**: React Hook Form + a Zod schema as the single source of both TypeScript types and runtime validation (`src/lib/validations/`).
- **Shared UI primitives** (`components/ui/`) are deliberately dumb — `StatTile`, `BarList`, `Funnel`, `Panel`, `GroupedTags` render whatever data they're given and compute zero business logic themselves; all the numbers they display come from `project()`.
- **Auth state**: `AuthProvider` wraps the app, exposing `useAuth()` → `{ user, loading, auth, signOut }`. `user.role` (from the Firebase custom claim, not client-editable) gates every role-specific page.

## Backend architecture

There is currently **no Cloud Functions deployment** — all privileged/server-side logic runs in **Next.js API routes** (`src/app/api/**/route.ts`) using the **Admin SDK**, via `server-composition.ts`. This is a deliberate MVP choice, not an oversight: the same use-case functions (`endCall`, `rechargeWallet`, `submitReview`) are pure and port-based, so moving them into actual Cloud Functions later (for true event-driven fan-out, retries, or running `project()` server-side on `analytics_events` writes) is a composition-root change, not a rewrite.

**The rule that decides client vs. server for any given write**: if it touches a Security-Rules-protected aggregate (wallet balance, advisor rating, role custom claims), it's server-only via a dedicated `*Ledger` port + Admin adapter, invoked from an API route. Otherwise (call status progression, document creation, event emission) it can run client-side, because Security Rules already constrain what a client is allowed to write.

## Firebase architecture

- **Auth**: phone-OTP for buyers/advisors; email/password for staff (verifier/founder/admin) — port exists, **no login UI built for it yet**. Roles live in a custom claim (`role`), settable only via the guarded `/api/admin/set-role` route (itself gated: caller must already be staff).
- **Firestore**: see [DATABASE.md](./DATABASE.md) for the full collection-by-collection reference.
- **Storage**: verification documents (private), advisor profile photos (public read), call recordings (server-write, staff-read placeholder — no real recording pipeline exists).
- **Emulator Suite**: fully wired (`firebase.json`, `.firebaserc` → `demo-nodalaltalks`). `client.ts` auto-connects to emulators when `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, including the `appVerificationDisabledForTesting` flag needed to make phone auth testable at all against a fake project.

## The event log is the single source of truth

Ported directly from the approved `analytics.js` + `EVENT_ARCHITECTURE.md`:

- The **only** write on a user action that matters for analytics is appending an immutable event to the log (`analytics_events` in Firestore). Envelope:
  `{ id, name, ts, actorId, actorType, sessionId, entity, props, eventVersion, schemaVersion, source, platform, environment }`. The last five are stamped by `createEvent()` from an injected `RuntimeContext` (never read from ambient `process.env` inside `src/core`) via the single `createEventEmitter()` helper every use case shares — old events are never rewritten, only superseded by a bumped `eventVersion`/`schemaVersion` on new ones.
- **Read-models** (`users`, `advisor_profiles`, `calls`, …) are **projections** of the log — caches, never authored directly. This is the Stripe/ledger pattern: events are immutable truth; everything else is derived.
- **`project(events)`** (`src/core/application/projections/project.ts`) is the single reducer that turns the log into every dashboard metric. No tile is hardcoded. It is pure and deterministic, so it runs unchanged in the browser (MVP) and later inside a Cloud Function `onCreate(analytics_events/{id})`.
- **`trend.ts`** (`comparePeriod`) extends this with period-over-period comparison — still just calling the same pure reducer twice on two event-log slices, no new architecture.

### MVP → scale, with no rewrite

| | MVP (now) | Scale (later) |
|---|---|---|
| `track()` write | `EventRepository` → Firestore `addDoc` (client) or Admin SDK (server) | same port, same adapters |
| metrics | `project()` in the browser, replaying the full log every load | same `project()` in a Cloud Function → `metrics_daily` read-model |
| dashboards | read `project(getEvents())` live | `onSnapshot` on the precomputed read-model |

Because the UI already reads from a *projection* (never raw UI state), the swap changes **where** numbers come from, never **how** the UI works. The `NEXT_PUBLIC_EVENT_BACKEND` env var selects the adapter (`local` in-memory vs `firestore`).

## Ports (abstraction boundaries)

Defined in `src/core/application/ports`. Use cases depend only on these; adapters in `infrastructure` implement them. Full list:

| Port | Why it exists | MVP adapter | Scale adapter |
|---|---|---|---|
| `EventRepository` | the one read/write path for the log | in-memory / Firestore (client) / Admin (server) | same, unchanged |
| `PaymentGateway` | provider must be replaceable | `PlaceholderPaymentGateway` | Razorpay / Stripe |
| `CallService` | calling SDK must be replaceable | `PlaceholderCallService` | Agora / Twilio |
| `NotificationService` / `EmailService` / `SmsService` | transport-agnostic messaging | `ConsoleNotificationService` (push only; email/SMS unimplemented) | FCM / SendGrid / Twilio |
| `WalletLedger` | atomic, server-owned money movement | `AdminWalletLedger` (Firestore transaction) | same |
| `ReviewLedger` | atomic review + rating-aggregate write | `AdminReviewLedger` | same |
| `SystemSettingsRepository` | founder-configurable business rules | Firestore (client read/write) + Admin (server read) | same |
| `HashService` | content hashing for future duplicate-doc detection | `WebCryptoHashService` (Web Crypto API, browser + Node) | same |
| `RoleClaimService` | server-side-only role grants | `HttpRoleClaimService` → `/api/admin/set-role` | same |
| `StorageService` | file upload abstraction | `FirebaseStorageService` | same |
| `Clock` / `IdGenerator` / `SessionProvider` / `RuntimeContext` | keep the domain pure & testable | real implementations; tests pass fakes | same |
| `*Repository` (User, AdvisorProfile, Property, Document, Call, Review, Wallet, Notification, PayoutAccount) | one per Firestore collection, the only way a use case touches that collection | Firestore (client, read-mostly) + Admin (server, where writes are privileged) | same |

**Rule for adding a new port**: define it next to its first real consumer. Do not add a port for a capability nothing calls yet (see `AI_ROADMAP.md` for why no `AIInsightsService` port exists despite Phase 4 being on the roadmap).

## Roles & access

`buyer · advisor · verifier · founder · admin`. Each role sees only permitted data, enforced by Firestore Security Rules (see [DATABASE.md](./DATABASE.md)). The event log is append-only for everyone and readable only by staff.

## AI-readiness

No AI is built yet — but the event log *is* the training/feature substrate. Every future question ("which builder has the highest demand?", "which advisors convert best?", "what concerns dominate?") is answerable by reading `analytics_events`. New intelligence = new projections over the same log, added without changing existing architecture. Phase 3 (Features 10–13) exercised this directly: every Intelligence slice was either a `project()` addition or, twice, discovered that the field already existed and just needed real event data flowing into it.

**Documents are the other seam prepared for Phase 4** (`VerificationDocument`): `contentHash` (computed today, via the injected `HashService` port), `ocrStatus` / `aiProcessingStatus` (honestly `"pending"` — no pipeline runs yet), and `retrievalTags` (fully unpopulated — the seam for future semantic search). No pipeline exists; only the schema does.

**No speculative AI ports.** See [AI_ROADMAP.md](./AI_ROADMAP.md) for the full reasoning and what the next AI feature should look like architecturally when it's scoped.

## Testing

`src/core` is pure TypeScript and tested with Vitest in the `node` environment — no DOM, no mocks of Firebase needed, because nothing in `core` imports Firebase. `project.test.ts` replays event scenarios and asserts derived metrics — guaranteeing the reducer never drifts from approved behavior. A handful of infrastructure adapters (`WebCryptoHashService`, `InMemoryEventRepository`) have their own tests. As of this writing: 42 tests, all passing, across 10 test files.

**What tests do not cover**: Security Rules behavior, and any full user-facing flow. Both require the Firebase Emulator Suite — see [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) for how to run it. This session found two real Security Rules bugs that no unit test caught.
