# API Reference

NoDalalTalks has two "API" layers worth documenting separately:

1. **HTTP API** — the Next.js Route Handlers under `src/app/api/**`, the only HTTP surface this app exposes.
2. **Application API** — the use cases in `src/core/application/use-cases/`, which is what actually matters architecturally (the HTTP routes are thin wrappers around these).

There are **no Cloud Functions** deployed (no `functions/` directory exists) — see [ARCHITECTURE.md](./ARCHITECTURE.md) "Backend architecture."

---

## HTTP API (Next.js Route Handlers)

All routes run on `export const runtime = "nodejs"` (the Admin SDK is not Edge-compatible). All require a Firebase ID token in `Authorization: Bearer <token>` except where noted.

### `POST /api/wallet/recharge`
Verifies a payment and atomically credits the buyer's wallet.
- **Auth**: any signed-in buyer.
- **Body**: `{ amountPaise: number, method?: string }`
- **Validates**: amount is an integer within `system_settings/global`'s configured min/max (founder-adjustable, not hardcoded).
- **Calls**: `rechargeWallet` use case → `buildRechargeDeps()`.
- **Response**: `{ balancePaise: number, transactionId: string }` or `{ error: string }` (400/401).

### `POST /api/calls/[callId]/end`
The only path that can write a call's billing fields.
- **Auth**: any signed-in participant (buyer or advisor).
- **Body**: `{ reason?: "buyer_hangup"|"advisor_hangup"|"connection_lost" }` (defaults to `buyer_hangup`).
- **Calls**: `endCall` use case → `buildEndCallDeps()`. Computes duration/charge, debits the buyer + pays the advisor atomically (`WalletLedger.settleCall`), sends both parties a notification.
- **Response**: `{ status, durationSec, amountChargedPaise }` or `{ error }` (400/401).

### `POST /api/reviews`
The only path that can write a review (folding its rating into the advisor's cached aggregate requires the Admin SDK).
- **Auth**: any signed-in buyer.
- **Body**: `{ callId: string, rating: number, confidenceShift?: "more"|"same"|"less", concernTags?: string[], comment?: string }`
- **Calls**: `submitReview` use case → `buildSubmitReviewDeps()`.
- **Response**: `{ review }` or `{ error }` (400/401).

### `POST /api/admin/set-role`
The ONLY path that sets a role custom claim. Guarded, circular-safe-by-design (see [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md) for how to bootstrap the very first staff account).
- **Auth**: caller must already be staff (verifier/founder/admin).
- **Body**: `{ uid: string, role: string }`
- **Rule**: only founder/admin may grant a *staff* role; verifiers may only grant `advisor`.
- **Calls**: `auth.setCustomUserClaims()` directly (no use case — this is infrastructure-only).
- **Response**: `{ ok: true, uid, role }` or `{ error }` (400/401/403).

---

## Application API (use cases — the real internal surface)

Every use case is a pure function: `(actor, input, deps) => Promise<result>`, where `deps` is an object of **ports only** (no concrete Firebase types ever appear in a use case's signature). This is what you call from a hook (client-side use cases) or an API route (server-side use cases).

| Use case | File | Runs | Deps (ports) | Effect |
|---|---|---|---|---|
| `registerBuyer` | `register-buyer.ts` | client | `UserRepository`, `EventRepository`, `Clock`, `IdGenerator`, `SessionProvider`, `RuntimeContext` | Creates `users/{uid}`, emits `buyer_signup` |
| `submitAdvisorApplication` | `submit-advisor-application.ts` | client | `AdvisorProfileRepository`, `PropertyRepository`, `DocumentRepository`, `PayoutAccountRepository`, `StorageService`, `HashService`, + system ports | Creates advisor_profiles/properties/documents/payout_accounts, uploads files, emits 4 events |
| `startVerification`, `decideDocument`, `activateAdvisor`, `rejectAdvisor` | `verification.ts` | client (staff-authenticated) | `AdvisorProfileRepository`, `DocumentRepository`, `PropertyRepository`, `RoleClaimService` (activate only), + system ports | Verifier workflow; `activateAdvisor` grants the `advisor` role server-side via `RoleClaimService` |
| `rechargeWallet` | `recharge-wallet.ts` | **server only** | `PaymentGateway`, `WalletLedger`, + system ports | Verifies payment, atomic credit |
| `requestCall`, `cancelCall` | `calls.ts` | client | `AdvisorProfileRepository`, `PropertyRepository`, `WalletRepository`, `CallRepository`, `CallService`, + system ports | Creates/updates `calls/{id}`, mints a calling session |
| `endCall` | `calls.ts` | **server only** | `CallRepository`, `WalletLedger`, `SystemSettingsRepository`, `NotificationRepository`, `NotificationService`, + system ports | Atomic billing settlement + notifications |
| `submitReview` | `submit-review.ts` | **server only** | `CallRepository`, `ReviewLedger`, + system ports | Atomic review write + rating aggregate update |

"System ports" = `Clock`, `IdGenerator`, `SessionProvider`, `RuntimeContext`, `EventRepository` — every use case takes these to emit its events via the shared `createEventEmitter()`.

**"Client" vs "server only" is enforced by which composition root wires the deps** — `composition.ts` (client, Firebase JS SDK) vs `server-composition.ts` (server, Admin SDK, marked `import "server-only"` so it can never leak into a client bundle).

## Presentation-layer hooks (by feature)

These are the actual call sites for the use cases above, plus read-only queries. All in `src/presentation/features/<area>/hooks.ts` unless noted.

| Feature | Hooks | Notes |
|---|---|---|
| `buyer/` | `useRegisterBuyer`, `useActiveAdvisors`, `useAdvisorProfile` | `useAdvisorProfile` degrades gracefully if `properties` read is denied (signed-out visitor) |
| `advisor-onboarding/` | `use-submit-advisor-application.ts` | wraps `submitAdvisorApplication` |
| `verification/` | `hooks.ts` | wraps the 4 verification use cases + document/queue reads |
| `wallet/` | `hooks.ts` (`useWallet`, `useRecharge`) | `useRecharge` posts to `/api/wallet/recharge` |
| `calls/` | `hooks.ts` (`useRequestCall`, `useCall`, `useEndCall`) | `useCall` polls every 4s while `status === "started"`; `useEndCall` posts to `/api/calls/[id]/end` |
| `reviews/` | `hooks.ts` (`useAdvisorReviews`, `useReviewForCall`, `useSubmitReview`) | `useSubmitReview` posts to `/api/reviews` |
| `notifications/` | `hooks.ts` (`useNotifications`, `useMarkNotificationRead`) | |
| `founder/` | `use-metrics.ts`, `use-trend.ts`, `use-settings.ts` | `useMetrics` subscribes live (`onSnapshot`) to the full event log — see the known bug about it firing before the auth gate in [COMPLETE_PROJECT_STATE.md](./COMPLETE_PROJECT_STATE.md) |
| `analytics/` | `use-track.ts` | the generic `track(name, entity, props)` hook for lightweight events not tied to a use case (search, profile view, shortlist) |

## Composition roots (where ports become concrete adapters)

- **`src/infrastructure/composition.ts`** (client): `buildAdvisorOnboardingDeps`, `buildVerificationDeps`, `buildBuyerDeps`, `buildWalletReader`, `buildCallDeps`, `buildCallReader`, `buildSettingsRepo`, `buildNotificationReader`, `buildReviewReaders`.
- **`src/infrastructure/server-composition.ts`** (server, Admin SDK, `import "server-only"`): `buildRechargeDeps`, `buildEndCallDeps`, `buildSettingsReader`, `buildSubmitReviewDeps`.

If you need a new use case wired up, add a `buildXDeps()` function to the appropriate composition root — never `new` an adapter directly inside a hook or component.

## Cloud Functions

**None exist.** No `functions/` directory, no `firebase.json` functions config. Everything that would traditionally be a Cloud Function (triggers on Firestore writes, scheduled jobs, webhook handlers for a real payment provider) currently either doesn't exist or is simulated by an API route. This is the most significant infrastructure gap for a production launch — see [ROADMAP.md](./ROADMAP.md).
