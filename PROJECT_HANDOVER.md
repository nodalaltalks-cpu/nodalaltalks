# NoDalalTalks — Project Handover

Read this first if you are a new engineer or a fresh Claude Code session with no memory of prior work on this repo. It tells you how to get running, how this team works, and exactly what to do first.

For a full state-of-everything snapshot (features, bugs, debt), see [COMPLETE_PROJECT_STATE.md](./COMPLETE_PROJECT_STATE.md). For the codebase's architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [DATABASE.md](./DATABASE.md). For what to build next, see [ROADMAP.md](./ROADMAP.md).

---

## 1. Get it running locally

```bash
npm install
```

### Option A — Firebase Local Emulator Suite (recommended for real verification)

Requires a JRE (Firestore/Storage emulators run on Java). If `java -version` fails, install one (e.g. `winget install Microsoft.OpenJDK.21` on Windows).

```bash
# .env.local — copy from .env.example and set:
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-nodalaltalks.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-nodalaltalks
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-nodalaltalks.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
FIREBASE_SERVICE_ACCOUNT=
GCLOUD_PROJECT=demo-nodalaltalks
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
NEXT_PUBLIC_EVENT_BACKEND=firestore
PAYMENT_PROVIDER=placeholder
CALL_PROVIDER=placeholder
```

```bash
npx firebase emulators:start --only auth,firestore,storage --project demo-nodalaltalks
# separately:
npm run dev
```

Emulator UI: `http://127.0.0.1:4000`. The emulator DB is empty on every fresh start — see "Seeding test data" below.

**Known gotcha**: phone-OTP sign-in is flaky against the emulator because `RecaptchaVerifier` tries to reach a real reCAPTCHA config that doesn't exist for a fake `demo-` project. `client.ts` already sets `auth.settings.appVerificationDisabledForTesting = true` in emulator mode (Firebase's documented workaround), but this session still saw intermittent failures. The Auth Emulator's REST API works reliably if you need to script around it:
```bash
curl -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-api-key" \
  -H "Content-Type: application/json" -d '{"phoneNumber":"+919999999999","recaptchaToken":"ignored"}'
curl "http://127.0.0.1:9099/emulator/v1/projects/demo-nodalaltalks/verificationCodes"   # lists the real OTP code
```

**Seeding test data** (there is no seed script committed — write one ad hoc with `firebase-admin`, pointed at the emulator via the same env vars, and delete it when done; do not commit throwaway seed scripts). Minimum useful seed: one `advisor_profiles` doc with `status: "active"` and the denormalized public fields (`primaryProject`, `primaryBuilder`, `primaryCity`, `expertise`), one matching `properties` doc, one `wallets` doc for a test buyer.

**Testing staff-only pages** (`/founder`, `/verifier/documents`): there is no login UI for email/password (staff) auth yet. To test as staff, create a user + set the `role` custom claim via `firebase-admin` directly against the emulator, then sign in via `signInWithEmailAndPassword` — but note there is no UI path to do this today; you'd need to either build the missing staff login page first, or drive it through test tooling (Admin SDK custom token + injecting the session).

### Option B — Real Firebase project

Fill in real values in `.env.local` from a Firebase console project, set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`, deploy `firestore.rules`/`storage.rules`/`firestore.indexes.json` via `firebase deploy --only firestore:rules,storage:rules,firestore:indexes`, and provide `FIREBASE_SERVICE_ACCOUNT` (the service account JSON as a single-line string) for Admin SDK routes. Phone auth and reCAPTCHA work normally against a real project.

### Verification commands (no Firebase needed)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test            # vitest run — 42 tests, all in src/core (pure) + a few infra adapters
npm run build       # next build — also type-checks and lints
```

All four must pass before any commit in this codebase, per established convention.

---

## 2. How this team works (conventions established over the project's history)

- **Feature-by-feature.** Each feature gets its own commit(s): implementation + tests + a README.md changelog entry. Look at `git log --oneline` and the README's "Build status" section for the actual chronological history — it's treated as a living changelog, more current than any snapshot doc.
- **`src/core` never imports Firebase, Next, or React.** If you're tempted to import something framework-specific into `core/domain` or `core/application`, stop — that logic belongs in `infrastructure` or `presentation`, or the dependency needs to go through a new port.
- **The event log is the only thing written on a user action that matters for analytics.** Never hardcode a dashboard number — add or extend a projection in `project()` instead. Before writing a new projection, **check whether the field already exists but is unused** — this happened three times in one session (Features 10, 11, 12 were mostly "surface an already-computed field," not new logic). Run `grep -oP '^\s{2}\w+:' src/core/application/projections/metrics.types.ts` against what `FounderDashboard.tsx` actually renders.
- **Anything that touches money or a role-protected aggregate goes through a dedicated `*Ledger` port with an Admin-SDK-only adapter**, doing the write atomically in one Firestore transaction (see `WalletLedger.settleCall`, `ReviewLedger.submit`). Client-writable collections get a separate read-only `*Repository` port. Don't let a client write directly to anything Security Rules mark server-owned.
- **Don't add a port without a real, immediate consumer.** `HashService` was added because `submitAdvisorApplication` needed it that same session. A hypothetical `AIInsightsService` was explicitly *not* added despite being "on the roadmap," because nothing calls it yet. When you do build the first AI feature, define its port next to that feature, not in advance.
- **Every commit that touches Security Rules should be treated as a security review, not a routine change.** This session found two real rules-vs-UI mismatches (properties collection, Founder Dashboard listener ordering) purely by clicking through the live app — typecheck/lint/tests did not catch either. **Live verification against the emulator catches bugs that static checks cannot; budget time for it.**
- **Be honest about verification status in commit messages.** This codebase's commit history explicitly notes when something was "verified via typecheck/lint/build/tests" vs. "verified live in a browser" vs. "not verified live — here's why." Keep doing that; it's how this document could be written accurately.

## 3. Where things actually are (quick index)

| I need to... | Look here |
|---|---|
| Add a new event type | `src/core/domain/events/event-names.ts` (never rename/remove existing ones — the log is append-only and historical events carry these strings) |
| Add/change a dashboard metric | `src/core/application/projections/project.ts` + `metrics.types.ts`, then surface in `FounderDashboard.tsx` |
| Add a new Firestore collection | Entity in `core/domain/entities/`, port in `core/application/ports/repositories.ts`, Firestore + (if server-only) Admin adapter in `infrastructure/repositories/`, rule in `firestore.rules`, wire into `composition.ts`/`server-composition.ts` |
| Add a new use case | `src/core/application/use-cases/` — pure function, ports-only deps, no Firebase imports |
| Change a security rule | `firestore.rules` or `storage.rules` — then re-verify every UI path that reads/writes that collection, not just the one you're thinking about |
| Add a UI page | `src/app/(group)/route/page.tsx`, feature component in `src/presentation/features/<area>/` |

## 4. What should the next Claude Code session do first?

In order:

1. **Fix the Founder Dashboard listener-before-gate bug.** In `src/presentation/features/founder/FounderDashboard.tsx`, `useMetrics()` (and `useWeeklyTrend()`) are called before the `isAdminRole` check, so an unauthorized visitor triggers a live Firestore `onSnapshot` on `analytics_events` and gets an uncaught `permission-denied` error. Fix: gate the hook call itself (conditionally call it, or pass an `enabled` flag through to the underlying query/listener so it never subscribes for an unauthorized user).
2. **Resume live end-to-end verification** using the emulator setup above: seed data, sign up a buyer, onboard an advisor, activate them as a verifier, recharge a wallet, place a call, end it, leave a review, and confirm the Founder Dashboard's numbers move accordingly. This closes the last real gap between "tests pass" and "the product works."
3. **Build a staff login page.** `signInWithEmail` is implemented and unused — verifiers and founders currently cannot sign in through the app at all.
4. **Move to [ROADMAP.md](./ROADMAP.md)'s prioritized backlog** once the above are clear.

Do not start Phase 4 (real AI) without first reading [AI_ROADMAP.md](./AI_ROADMAP.md) and getting an explicit decision on which capability to scope — this was deliberately left unscoped by design, not by oversight.
