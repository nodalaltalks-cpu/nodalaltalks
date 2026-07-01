# NoDalalTalks

India's buyer-to-buyer real estate consultation platform. Talk to someone who
**already bought there** — verified owners, paid per minute, no brokers.

This repository is the production application. It is built event-first: an
append-only event log is the single source of truth, and every dashboard metric
is *computed* from it — never hardcoded.

## Tech stack

- **Frontend:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui · React Hook Form · Zod · TanStack Query
- **Backend:** Firebase Auth · Cloud Firestore · Storage · Cloud Functions · Cloud Messaging _(wired from Feature 2)_
- **Payments:** swappable behind a `PaymentGateway` port (Razorpay / Stripe)
- **Calling:** swappable behind a `CallService` port (placeholder → Agora / Twilio)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in when Firebase is wired (Feature 2)
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Run the Vitest suite (core is pure, runs in node) |
| `npm run test:watch` | Watch mode |

## Project layout

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full rationale.

```
src/
  core/             pure domain + application logic (NO framework/firebase imports)
    domain/         entities, value objects, the event taxonomy + factory
    application/    projections (project reducer), ports (interfaces), use cases
  infrastructure/   adapters implementing the ports (firebase, payments, calling…)
  presentation/     Next.js routes, components, hooks
  app/              Next.js App Router entry (layout, globals, routes)
  lib/              cross-cutting helpers + Zod schemas
```

## Engineering rules (non-negotiable)

1. **`src/core` never imports Firebase, Next, or any adapter.** Dependencies point inward.
2. **The event log is the only thing written on a user action.** Read-models are projections.
3. **No hardcoded dashboard values.** Everything derives from `project()`.
4. **Business logic lives in `application`, never in components.**
5. **Zod schemas are the single definition** for validation *and* types.

## Build status

- **Feature 1 — Foundation + Event Core ✅**: scaffold, design system, typed
  event taxonomy + `project()` reducer with parity tests, port interfaces.
- **Feature 2 — Firebase + Auth + Security Rules ✅**: domain entities for every
  collection, `AuthService` port + Firebase adapter (role custom claims),
  Firestore + in-memory `EventRepository` adapters with an env-driven factory,
  system adapters (clock/id/session), React providers (Auth + Query), and
  production `firestore.rules` / `storage.rules` + emulator config.
- **Feature 3 — Advisor Onboarding (live) ✅**: Zod schema (single source for the
  5-step form), `submitAdvisorApplication` use case (writes advisor_profiles +
  properties + documents + private payout_accounts, uploads files, emits
  advisor_signup_started / document_uploaded / advisor_rate_set / advisor_submitted),
  `StorageService` port + Firebase adapter, Firestore repository adapters, a
  composition root, a TanStack Query mutation hook, and the onboarding UI rebuilt
  as React components on the approved design.
- **Feature 4 — Documents Dashboard (live) ✅**: verification use cases
  (startVerification / decideDocument / activateAdvisor / rejectAdvisor) with a
  KYC-style required-document checklist gating activation; role elevation only
  via a guarded server route (`/api/admin/set-role`) using the Admin SDK; live
  verifier queue with SLA aging + review workbench; an immutable event audit
  trail for every decision.
- **Feature 5 — Buyer Flow (live) ✅**: phone-OTP signup → `registerBuyer` use
  case (writes users/{uid} + emits buyer_signup with demand intent), a `useTrack`
  hook (the React `track()` for search / profile-view / shortlist / OTP events),
  `UserRepository` + active-advisor discovery, and the buyer UI (signup, search,
  advisor profile) on the approved design. Wallet/calls/reviews land in Phase 2.
- **Feature 6 — Founder Dashboard (live) ✅**: a `useMetrics` hook subscribing to
  the event log → the same `project()` reducer → six derived sections (Executive,
  Marketplace, Growth/AARRR, Buyers, Revenue, Trust). Zero hardcoded values;
  founder/admin guard. With `EVENT_BACKEND=firestore` it's a real-time onSnapshot.
- **Feature 7 — Wallet recharge (live) ✅**: `rechargeWallet` use case behind a
  `PaymentGateway` port (placeholder today, Razorpay/Stripe later with no use-case
  change), an Admin-SDK `WalletLedger` that atomically credits the wallet + writes
  an immutable transaction in one Firestore transaction, `wallet_recharged` /
  `payment_failed` events, and the buyer wallet UI. `Wallet`/`Transaction` carry
  `status`/`version`/`schemaVersion` for future migrations; the ledger already
  rejects writes against a frozen wallet.
- **Feature 8 — Calls (live) ✅**: `requestCall` (client-side; connects instantly
  through the placeholder `CallService`, no advisor-accept UI yet) and `endCall`
  (server-side only, mirroring rechargeWallet) behind the event-versioned
  envelope from Feature 7's refactor. Billing goes through a new
  `WalletLedger.settleCall` — debits the buyer and records the advisor's payout
  transaction atomically, so a charge can never exist without its payout line.
  Commission rate is one isolated constant until `system_settings` exists.
  Tightened `firestore.rules` so participants can progress a call's status but
  can never write its billing fields or mark it `completed` client-side. Buyer
  UI: "Talk Now" on the advisor profile → a live in-call screen with a running
  cost estimate and hang-up.
- **Feature 9 — Reviews (live) ✅**: `submitReview` is server-only, same
  reasoning as recharge/endCall — Security Rules restrict
  `advisor_profiles.ratingAvg`/`ratingCount` to staff writes, so folding a new
  rating into that cached aggregate can't happen from a buyer client. The new
  `ReviewLedger.submit` writes the review and updates the aggregate atomically;
  the review's doc id is its `callId`, making "one review per call" a
  Firestore-level guarantee. `firestore.rules` tightened to server-owned writes
  (public read unchanged) — reviews were previously client-creatable for any
  advisorId with no proof of an actual call. Buyer UI: a rating prompt right
  after a call ends, and the public review list on the advisor profile.
  **Phase 2 (Wallet · Calls · Reviews) complete.**
- **Feature 10 — Marketplace Intelligence (live) ✅**: fixed a latent data-plumbing
  gap — the Founder Dashboard's "Supply vs Demand by Project" panel had been
  rendering empty since Feature 6 because neither `calls.ts` nor
  `verification.ts` ever stamped `projectId` on the events `liquidityByProject`
  reads. Both now resolve the advisor's primary property and carry it through
  the relevant events (`Call.projectId`, previously unused, is now set at
  request time). Added `advisorConversion` (view → request → completed funnel
  per advisor) — the one genuinely missing metric — surfaced as a new panel
  with a simple derived recommendation, no AI.
- Phase 3 — Business / Advisor / Buyer / Revenue Intelligence _(next)_

### Firebase emulators

```bash
npm i -g firebase-tools          # one-time
firebase emulators:start         # Auth :9099 · Firestore :8080 · Storage :9199 · UI :4000
```
Rules live in `firestore.rules` / `storage.rules`; config in `firebase.json`.
The `demo-` project id lets the emulator run with no real Firebase project.

Development order follows the MVP Execution Blueprint: Sprint 1 (Firebase, Auth,
Onboarding, Documents, Founder Dashboard) → Sprint 2 (Wallet, Calls, Reviews) →
Sprint 3 (Notifications, Referrals) → Sprint 4 (AI / NoDalalTalks Intelligence).
