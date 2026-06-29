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

## The event log is the single source of truth

Ported directly from the approved `analytics.js` + `EVENT_ARCHITECTURE.md`:

- The **only** write on a user action is appending an immutable event to the log
  (`analytics_events` in Firestore). Envelope:
  `{ id, name, ts, actorId, actorType, sessionId, entity, props }`.
- **Read-models** (`users`, `advisor_profiles`, `calls`, `metrics_daily`, …) are
  **projections** of the log — caches, never authored directly. This is the
  Stripe/ledger pattern: events are immutable truth; everything else is derived.
- **`project(events)`** (`src/core/application/projections/project.ts`) is the
  single reducer that turns the log into every dashboard metric. No tile is
  hardcoded. It is pure and deterministic, so it runs unchanged in the browser
  (MVP) and later inside a Cloud Function `onCreate(analytics_events/{id})`.

### MVP → scale, with no rewrite

| | MVP (now) | Scale (later) |
|---|---|---|
| `track()` write | `EventRepository` → localStorage / in-memory | same port → Firestore `addDoc` |
| metrics | `project()` in the browser | same `project()` in a Cloud Function → `metrics_daily` |
| dashboards | read `project(getEvents())` | `onSnapshot` on the read-model |

Because the UI already reads from a *projection* (never raw UI state), the swap
changes **where** numbers come from, never **how** the UI works. The
`EVENT_BACKEND` env var selects the adapter — mirroring `NDT.config.backend`.

## Ports (abstraction boundaries)

Defined in `src/core/application/ports`. Use cases depend only on these; adapters
in `infrastructure` implement them.

| Port | Why it exists | MVP adapter | Scale adapter |
|---|---|---|---|
| `EventRepository` | the one read/write path for the log | in-memory / localStorage | Firestore |
| `PaymentGateway` | provider must be replaceable | placeholder | Razorpay / Stripe |
| `CallService` | calling SDK must be replaceable | placeholder | Agora / Twilio |
| `NotificationService` / `EmailService` / `SmsService` | transport-agnostic messaging | console | FCM / provider |
| `Clock` / `IdGenerator` / `SessionProvider` | keep the domain pure & testable | real | real |

## Roles & access (implemented in Feature 2)

`buyer · advisor · verifier · founder · admin`. Each role sees only permitted
data, enforced by Firestore Security Rules. The event log is append-only for
everyone and readable per-scope.

## AI-readiness

No AI is built yet — but the event log *is* the training/feature substrate. Every
future question ("which builder has the highest demand?", "which advisors convert
best?", "what concerns dominate?") is answerable by reading
`analytics_events`. New intelligence = new projections over the same log, added
without changing existing architecture.

## Testing

`src/core` is pure TypeScript and tested with Vitest in the `node` environment.
`project.test.ts` replays the event scenarios from the prototype demo and asserts
the derived metrics — guaranteeing the port never drifts from the approved logic.
