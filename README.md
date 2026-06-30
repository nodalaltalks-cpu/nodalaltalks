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
- Feature 3 — Advisor Onboarding (live) _(next)_

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
