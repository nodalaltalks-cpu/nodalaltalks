# Database Reference

Cloud Firestore (NoSQL document store) + Cloud Storage. This document is the collection-by-collection reference; for *why* the schema looks like this, see [ARCHITECTURE.md](./ARCHITECTURE.md) (event sourcing) and [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md).

All collection name constants live in `src/infrastructure/firebase/collections.ts` — never hardcode a collection name string elsewhere.

---

## Collections

### `users/{uid}`
Identity record, keyed by Firebase Auth UID. Created by `registerBuyer` after phone-OTP verification.

```ts
{
  uid: string; role: "buyer"; displayName: string; email: string; phone?: string;
  city: string; status: "active";
  buyer: { intent: "live_in"|"invest"|"resale"; targetProject?: string; budget: string;
            stage: "exploring"|"shortlisting"|"negotiating"|"ready_to_book"; timeline: string; source: string };
  createdAt: number; updatedAt: number;
}
```
**Rules**: read self or staff; create self as `buyer`/`active` only; update self (role/status immutable) or admin.

### `advisor_profiles/{advisorId}`
Keyed by the advisor's Auth UID. Public once `status === "active"`.

```ts
{
  advisorId: string; firstName: string; lastName: string; city: string; languages: string[];
  occupation?: string; industry?: string; bio?: string; photoPath?: string;
  availableDays: string[]; callHoursFrom?: string; callHoursTo?: string;
  maxCallsPerDay?: "1-2"|"3-5"|"unlimited";
  ratePerMinPaise: number; headline?: string;
  status: "draft"|"submitted"|"under_review"|"active"|"rejected"|"suspended";
  ownershipVerified: boolean; verifierId?: string; rejectionReason?: string;
  submittedAt?: number; activatedAt?: number;
  ratingAvg: number; ratingCount: number;          // cached, folded in atomically by ReviewLedger
  primaryPropertyId?: string;
  primaryProject?: string; primaryBuilder?: string; primaryCity?: string; expertise?: string[];
  // ^ public-safe denormalized copy of the primary property, added to fix anonymous-read access
  //   (properties/ requires sign-in and holds private financing fields — see ENGINEERING_DECISIONS.md)
  createdAt: number; updatedAt: number;
}
```
**Rules**: read if `status == 'active'` OR self OR staff. Create: self only, must start `draft`/`submitted` + `ownershipVerified: false`. Update: staff (anything) OR self (cannot touch `ownershipVerified`/`verifierId`/`ratingAvg`/`ratingCount`; status confined to pre-activation values, or the single `draft → submitted` transition).

### `properties/{propertyId}`
An advisor's claimed property. **Requires sign-in to read** — holds `homeLoan` (financing method) and a reserved-but-unpopulated `pricePaidPaise` field, both explicitly private. Public-safe fields are denormalized onto `advisor_profiles` instead (see above).

```ts
{
  id: string; advisorId: string; builder: string; project: string; city: string; locality: string;
  address?: string; propertyType: "apartment"|"villa"|"rowhouse"|"commercial"|"plot"|"other";
  configuration?: string; carpetAreaSqft?: number; floor?: string; tower?: string;
  yearOfPurchase: number; purchasePriceBucket?: string; pricePaidPaise?: number;  // ← private, unpopulated by current form
  possessionStatus: "received_living"|"received_rented"|"under_construction";
  possessionPromisedYear?: number; possessionActualYear?: number;
  homeLoan?: "bank"|"hfc_nbfc"|"self_funded";   // ← private
  expertise: string[]; notes?: string;
  createdAt: number; updatedAt: number;
}
```
**Rules**: read requires `isSignedIn()`. Create/update/delete: staff or the owning advisor.

### `documents/{documentId}`
A verification artifact. Sensitive — owner + staff only.

```ts
{
  id: string; advisorId: string; propertyId?: string; name: string; group: string; docType: string;
  fileName?: string; storagePath?: string; size?: number; mimeType?: string;
  contentHash?: string;        // SHA-256, computed at upload (HashService) — dup-detection groundwork
  uploadSource?: string;       // e.g. "web-app" — mirrors event envelope's `source`
  status: "pending_upload"|"uploaded"|"under_review"|"needs_reupload"|"rejected"|"approved"|"expired";
  uploadedBy?: string; uploadedAt?: number;
  reviewerId?: string; decidedAt?: number; notes?: string;
  ocrStatus?: "pending"|"processing"|"completed"|"failed"|"not_applicable";       // Phase 4 seam, always "pending" today
  aiProcessingStatus?: "pending"|"processing"|"completed"|"failed"|"not_applicable"; // Phase 4 seam
  retrievalTags?: string[];    // future semantic search — unpopulated
  createdAt: number; updatedAt: number; schemaVersion: number;
}
```
**Rules**: read self or staff. Create: self, status starts `uploaded`/`pending_upload`. Update: staff, or self (cannot touch `reviewerId`, status confined to pre-decision values).

### `calls/{callId}`
One consultation's full lifecycle.

```ts
{
  id: string; buyerId: string; advisorId: string; projectId?: string;
  status: "requested"|"accepted"|"declined"|"started"|"completed"|"cancelled";
  ratePerMinPaise: number;
  requestedAt: number; acceptedAt?: number; startedAt?: number; endedAt?: number;
  durationSec?: number; amountChargedPaise?: number; advisorPayoutPaise?: number;
  recordingConsented?: boolean; recordingPath?: string;   // no real recording pipeline exists yet
  connectionDrops?: number; avgLatencyMs?: number; setupTimeSec?: number; endReason?: string;
  createdAt: number; updatedAt: number; schemaVersion: number;
}
```
**Rules**: read participants or staff. Create: buyer only, status must start `requested`. **Update: participants may progress status through `accepted`/`started`/`cancelled` only — billing fields (`amountChargedPaise`, `advisorPayoutPaise`, `durationSec`, `endReason`) and the `completed` status can never be client-written; only `endCall` via the Admin SDK sets them.** This asymmetry is deliberate and was tightened during Feature 8 after finding the original rule let any participant write anything.

### `wallets/{buyerId}` — SERVER-OWNED
```ts
{
  buyerId: string; balancePaise: number; totalRechargedPaise: number;
  status: "active"|"frozen"; lastActivityAt?: number;
  createdAt: number; updatedAt: number; version: number; metadata?: Record<string, unknown>;
}
```
**Rules**: read self or staff. **Write: `if false` — Admin SDK only**, via `WalletLedger`.

### `transactions/{transactionId}` — SERVER-OWNED, append-only
```ts
{
  id: string; ownerId: string; type: "recharge"|"call_debit"|"refund"|"advisor_payout";
  amountPaise: number; balanceAfterPaise?: number; status: "success"|"failed"|"pending";
  method?: string; ref?: string; failureReason?: string;
  createdAt: number; schemaVersion: number; metadata?: Record<string, unknown>;
}
```
**Rules**: read staff or the owning `ownerId`. **Write: `if false` — Admin SDK only.**
**Composite index**: `(ownerId ASC, createdAt DESC)`.

### `reviews/{reviewId}` — SERVER-OWNED, doc id == callId
```ts
{
  id: string; callId: string; advisorId: string; buyerId: string;
  rating: number;                     // 1–5
  confidenceShift?: "more"|"same"|"less"; concernTags: string[]; comment?: string;
  createdAt: number; schemaVersion: number;
}
```
**Rules**: read `if true` (public). **Write: `if false` — Admin SDK only**, via `ReviewLedger.submit`, which atomically writes the review AND folds the rating into `advisor_profiles.ratingAvg/ratingCount` in one transaction. Doc ID equals `callId`, so "one review per call" is a Firestore-level guarantee, not an app-level check.
**Composite index**: `(advisorId ASC, createdAt DESC)`.

### `payout_accounts/{advisorId}` — PRIVATE
Bank details, never on the public profile.
```ts
{ advisorId: string; accountHolderName: string; bankName: string; accountNumber: string;
  ifsc: string; upiId?: string; createdAt: number; updatedAt: number; }
```
**Rules**: read/write self or staff (read); create/update self only; delete admin only.

### `notifications/{notificationId}` — SERVER-OWNED create
```ts
{
  id: string; userId: string; type: string; title: string; body: string; read: boolean;
  data?: Record<string, string>; createdAt: number;
}
```
**Rules**: read staff or self (`userId`). **Update: self, but only the `read` field** (enforced via `diff().affectedKeys().hasOnly(['read'])`). Create/delete: Admin SDK only. Currently only written by `endCall` (both buyer and advisor get a receipt).

### `system_settings/global` — singleton
Founder-configurable business rules, replacing what used to be hardcoded constants.
```ts
{
  platformCommissionRate: number;      // 0–1, default 0.2
  walletRechargeMinPaise: number;      // default 10_000 (₹100)
  walletRechargeMaxPaise: number;      // default 5_000_000 (₹50,000)
  updatedAt: number; updatedBy?: string;
}
```
`SystemSettingsRepository.get()` returns `DEFAULT_SYSTEM_SETTINGS` if this doc has never been written — no migration needed pre-launch.
**Rules**: read staff; write admin only.

### `analytics_events/{eventId}` — THE append-only ledger
See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full envelope shape and philosophy.
```ts
{
  id: string; name: string; ts: number; actorId: string; actorType: "buyer"|"advisor"|"verifier"|"admin"|"system";
  sessionId: string; entity: { actorId?, actorType?, buyerId?, advisorId?, callId?, projectId?, verifierId?, documentId? };
  props: { /* verb-specific, see event-names.ts for the ~40 verbs and event.types.ts for known prop shapes */ };
  eventVersion: number; schemaVersion: number; source: string; platform: "web"|"ios"|"android"|"server";
  environment: "development"|"staging"|"production";
}
```
**Rules**: read staff only; **create if signed in; update/delete always `false`.**

### `activity_logs/{logId}` — server-written, not yet used
Rules exist (staff read, Admin SDK write only) but nothing in the codebase writes to this collection yet. Reserved for a future audit-trail feature distinct from `analytics_events` (business events) — see the original brief's "Business Data → Analytics → Audit Trail must remain separate" principle. **Not implemented.**

### `builders/{builderId}`, `projects/{projectId}` — reference data, not yet used
Rules exist (public read, admin write) but nothing reads or writes them. The app currently free-texts builder/project names (`Property.builder`, `Property.project`) rather than referencing a canonical list. **Not implemented.**

### `finance_settings/{docId}` — reserved, not yet used
Rules exist (staff read, admin write) but no entity, port, or adapter exists. Likely intended to separate finance-specific config from general `system_settings` — currently everything lives in `system_settings/global`. **Not implemented.**

---

## Firestore indexes

`firestore.indexes.json` (composite indexes only — single-field indexes are automatic):

| Collection | Fields |
|---|---|
| `transactions` | `ownerId ASC, createdAt DESC` |
| `calls` | `buyerId ASC, requestedAt DESC` |
| `reviews` | `advisorId ASC, createdAt DESC` |

If you add a new query combining an equality filter with an `orderBy` on a different field, you will need a new composite index — Firestore will throw with a direct link to create it; add the same entry to `firestore.indexes.json` so it's captured in source control (`firebase deploy --only firestore:indexes` or let the emulator auto-suggest it).

## Storage architecture (`storage.rules`)

| Path | Read | Write |
|---|---|---|
| `documents/{advisorId}/**` | self or staff | self only; ≤10MB; `image/*` or `application/pdf` |
| `advisor_photos/{advisorId}/**` | public | self only; ≤3MB; `image/*` |
| `recordings/{callId}/**` | staff only | `if false` — no real recording pipeline writes here yet |
| everything else | denied | denied |

## Money convention

All money is stored as **integer paise** (never floats), converted to rupees only at the presentation/analytics boundary via `src/core/domain/value-objects/money.ts` (`paiseToRupees`, `rupeesToPaise`, `formatPaise`, `callCharge`). This is why `analytics_events.props.amount` (rupees, for `project()`'s GMV/ARPU math) and `wallets.balancePaise` (paise, exact) look different — that's intentional, documented in `recharge-wallet.ts`'s header comment.
