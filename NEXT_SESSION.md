# NEXT_SESSION.md — Final Session Handover

**Written:** 2026-07-06, at the end of the session that executed the full M0–M15 beta implementation plan.
**Audience:** a brand-new Claude Code session (or human engineer) with zero prior chat history.
**Read this fully before writing any code.** Then read [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) and [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md).

---

## 1. Current git branch
`develop` (checked out). `main` exists but is behind — merge `develop → main` at the next stable milestone.

## 2. Latest commit hash
`e922381` — "Feature(M14): settings-driven advisor rate bounds; founder refund endpoint". Tag **`beta-ready`** points here. Working tree clean (only untracked `.claude/`, local tool config — leave it untracked).

## 3. Latest milestone completed
**M15 — the final milestone.** All 16 milestones (M0–M15) of the beta implementation plan are done, one commit each (`git log d27eab7..e922381`). M15 was the dress rehearsal: the full journey (verifier activates advisor → activation notification → advisor goes online → buyer recharges ₹500 → **free-first-minutes call billed ₹0** → 5-star review folds into the rating atomically → founder cockpit shows TCM=1 and Inbox-zero) passed end-to-end against the Firebase emulator through the real UI, with zero fixes needed.

## 4. Current project status
Feature-complete for a 20-advisor / 100-buyer invite-only beta, pending only the founder's Firebase console actions (§8). 51/51 tests, typecheck/lint/build green. Phases 1–3 of the original roadmap complete; Phase 4 (AI) deliberately unscoped (see [AI_ROADMAP.md](./AI_ROADMAP.md)). Sixteen numbered features + fourteen beta milestones shipped; every commit message documents what was verified and how.

## 5. Remaining work
- **Founder-blocked (not code):** M0 console steps (§8), then one real phone-OTP signup pass.
- **Post-beta engineering** (see [ROADMAP.md](./ROADMAP.md)): real payment provider (Razorpay), real calling (Agora/Twilio — calls currently simulated, clearly labeled), FCM push, pagination, server-side `project()` via Cloud Functions, `builders`/`projects` reference data, referral system, replace the provisional landing copy with the founder's approved prototype.

## 6. Exact next task
1. Founder performs §8's console steps.
2. Verify phone-OTP buyer signup end-to-end on the real project with a real phone — the ONLY journey piece never live-verified (emulator-blocked, see §18).
3. Then run the human beta test: ~20 advisors, ~100 buyers, following the M15 rehearsal script (activate → online → recharge → call → review → cockpit).

## 7. Production blockers
- No real Firebase project (§8) — hard blocker.
- Phone-OTP unverified on a real project — hard blocker for the buyer funnel.
- Real money and real audio are deliberately deferred: placeholder payments and simulated calls are **honestly labeled in the UI** (M4) and fine for beta; they block *full* production, not beta.

## 8. Firebase setup still required (founder's Google account needed — cannot be automated)
Step-by-step runbook lives at the top of **`.env.example`**. Summary: create project → enable Phone + Email/Password auth (**Phone SMS requires the Blaze plan since 2024** — card on file, ~₹1/SMS, trivial at beta scale) → create Firestore + Storage → copy web-app config into `.env.local` → generate service-account key into `FIREBASE_SERVICE_ACCOUNT` → `npx firebase login` → `npx firebase use <id>` → `npx firebase deploy --only firestore:rules,firestore:indexes,storage` → set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`, `NEXT_PUBLIC_EVENT_BACKEND=firestore`.

## 9. Deployment status
**Not deployed anywhere.** No hosting configured. Recommended: Vercel hobby tier (free) for the Next.js app; Firebase rules/indexes deploy via the CLI (§8). No CI/CD exists.

## 10. How to run locally
Requires Node (v26 installed), a JRE for emulators (Microsoft OpenJDK 21 installed at `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot` — not on PATH; set `JAVA_HOME`/`PATH` inline). `firebase-tools` is a dev dependency (use `npx firebase`). Full instructions incl. emulator gotchas and seeding guidance: [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md). Emulator data is **in-memory — lost on every restart**; write ad-hoc seed scripts with `firebase-admin` in the repo root and **delete them before committing**.

## 11. Commands to start the app
```bash
# terminal 1 — emulators (set JAVA_HOME first on this machine):
export JAVA_HOME="/c/Program Files/Microsoft/jdk-21.0.11.10-hotspot"; export PATH="$JAVA_HOME/bin:$PATH"
npx firebase emulators:start --only auth,firestore,storage --project demo-nodalaltalks
# terminal 2:
npm run dev          # http://localhost:3000 — emulator UI at http://127.0.0.1:4000
```
**⚠ Never run `npm run build` while `npm run dev` is running** — they share `.next` and corrupt it (bitten twice this session). Stop dev first, or `rm -rf .next` and restart dev after building.

## 12. Commands to run tests
```bash
npm run typecheck && npm run lint && npm test && npm run build   # all four before EVERY commit
```
51 tests, Vitest, all green at handover.

## 13. Founder login flow
`/staff/login` → email + password → role-routed to `/founder` (cockpit; action inbox on top, ⚙ Settings link → `/founder/settings`). Founder role comes from the `role` custom claim. **Bootstrap problem:** the first founder account cannot be created through the app — create the Auth user and set `{ role: "founder" }` via a one-off `firebase-admin` script (documented in [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md)). Emulator test account used this session: `founder@test.local` / `TestPass123!` (recreate after every emulator restart).

## 14. Advisor login flow
**Advisor is a capability, not a role or separate account** (M5 — see §19). Advisors sign in exactly like buyers (phone OTP at `/buyer/signup`). Their advisor mode lives at `/advisor/dashboard`: status card, earnings, call history, and the **online/offline toggle** (they must consciously go online before calls can reach them). Entry: onboarding success panel ("Track your application") or direct URL. Verifier test account: `verifier@test.local` / `TestPass123!` (emulator, same caveat).

## 15. Buyer login flow
`/buyer/signup` ("Sign up or log in" — phone OTP is both): phone → OTP → details (`registerBuyer` writes `users/{uid}` + emits `buyer_signup`). Supports `?next=` return paths — "Talk Now" on an advisor profile sends signed-out buyers here and returns them to the profile after (M10). Browsing (`/buyer`, advisor profiles) requires **no auth** — protect that property.

## 16. All environment variables required
See `.env.example` (authoritative, with the production runbook). Summary:
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`, `FIREBASE_SERVICE_ACCOUNT` (server-only; empty against emulators), `NEXT_PUBLIC_EVENT_BACKEND` (`local`|`firestore`), `PAYMENT_PROVIDER` (`placeholder`), `CALL_PROVIDER` (`placeholder`). Emulator mode additionally: `GCLOUD_PROJECT=demo-nodalaltalks`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`, and fake-but-non-empty `NEXT_PUBLIC_FIREBASE_*` values (see PROJECT_HANDOVER.md).

## 17. Current architecture assumptions
- Clean Architecture, dependency rule absolute: **`src/core` never imports Firebase/Next/React** (full detail: [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), [API_REFERENCE.md](./API_REFERENCE.md)).
- Append-only `analytics_events` is the single source of dashboard truth; `project()` (pure reducer) derives every metric, currently replaying the full log client-side (fine at beta scale; Cloud Function migration path pre-designed).
- No Cloud Functions — all privileged logic runs in Next.js API routes with the Admin SDK via `server-composition.ts`.
- Money = integer paise everywhere; rupees only at presentation/analytics boundaries.
- Anything touching money or rules-protected aggregates goes through a `*Ledger` port (Admin-SDK-only, atomic Firestore transaction).
- Business rules (commission %, wallet limits, rate bounds, free first minutes) live in `system_settings/global` (world-readable, admin-writable), founder-editable with in-code defaults.

## 18. Known bugs
- **Phone-OTP flaky against emulators only**: fake `demo-` projects have no reCAPTCHA site key; `appVerificationDisabledForTesting` is already set and a 25s timeout surfaces the failure, but the browser flow remains unreliable in the emulator. The Auth Emulator's REST API works (see PROJECT_HANDOVER.md). **Expected to vanish on a real project — verify there before calling it fixed.**
- Cosmetic: `/buyer/call/[id]` says "Call not found" for permission-denied as well as genuinely missing calls.
- Dev-environment only: the `.next` build/dev conflict (§11).
- Historical note: a critical silent-event-loss bug (client SDK throwing on nested `undefined` in event props) was found and fixed this session (`0f5bdd8`) — if events ever seem to go missing again, read that commit first.

## 19. Important decisions that must never be changed (full rationale: ENGINEERING_DECISIONS.md)
1. **Advisor is a capability of a buyer identity, not a role claim** — claims are for staff privilege only. Never reintroduce an "advisor" claim.
2. **The event log is append-only**; never rename/repurpose a verb in `event-names.ts`; never hardcode a dashboard value — extend `project()`.
3. **Client-side Firestore writes of nested data must pass through `pruneUndefinedDeep`** (the `0f5bdd8` lesson).
4. **Server-owned collections stay server-owned** (wallets, transactions, reviews); `*Ledger` writes stay atomic.
5. **Ports are defined next to their first real consumer** — no speculative interfaces (no `AIInsightsService` until a real caller exists).
6. **No AI work without explicit scoping** ([AI_ROADMAP.md](./AI_ROADMAP.md)).
7. **Placeholder adapters are deliberate** (payments/calling/push) — swap via composition roots, never restructure around them; keep the honest beta labeling until real providers land.
8. Commit style: one milestone/feature per commit, all four checks green, message states honestly what was and wasn't verified.

## 20. Ready-to-paste prompt for the next Claude Code session

> Read NEXT_SESSION.md in the repo root fully, then PROJECT_HANDOVER.md and ENGINEERING_DECISIONS.md. Do not write or modify any code until you've read all three. The repo is at tag `beta-ready` on `develop` — all M0–M15 milestones are complete and the emulator dress rehearsal passed.
>
> Current state: everything is founder-blocked on Firebase console setup (NEXT_SESSION.md §8 — the runbook is in .env.example). If the founder has completed it, your tasks in order are:
> 1. Verify `.env.local` points at the real project and rules/indexes are deployed (`npx firebase deploy --only firestore:rules,firestore:indexes,storage`).
> 2. Live-verify phone-OTP buyer signup end-to-end on the real project — the only journey piece never verified live (emulator reCAPTCHA limitation, NEXT_SESSION.md §18).
> 3. Bootstrap the real founder + verifier accounts via a one-off firebase-admin script (ENGINEERING_DECISIONS.md "Bootstrapping the first staff account"), then delete the script.
> 4. Re-run the M15 rehearsal script against the real project: onboard advisor → verify/activate via /verifier/documents → advisor goes online → buyer recharges → free-first-minutes call → review → founder cockpit reflects it.
> 5. Report readiness for the 20-advisor / 100-buyer human beta.
>
> If the founder has NOT completed the console setup, say so plainly, list their exact steps from .env.example, and pick up post-beta work from ROADMAP.md instead — do not fake or skip the real-project verification.
>
> Rules: follow NEXT_SESSION.md §19 without exception. Run `npm run typecheck && npm run lint && npm test && npm run build` before every commit (never build while dev is running). Work on `develop`; merge to `main` only at a stable milestone. Delete any ad-hoc seed scripts before committing.
