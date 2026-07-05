# AI Roadmap — "NoDalalTalks Intelligence" (Phase 4)

**Status as of this writing: architecture prep only. No AI model, no AI service, no AI port exists. This is deliberate, not an oversight — see "Why nothing is built yet" below.**

This document exists so the *next* session that picks up Phase 4 doesn't have to rediscover the reasoning that led here, and can scope real work quickly instead of re-litigating whether to start.

---

## Why nothing is built yet

Two mid-project checkpoints in this codebase's history both resolved the same way: when explicitly asked whether to scope a specific AI capability or stay in architecture-prep mode, the answer was **stay in prep mode**. The reasoning, preserved here because it should keep applying:

1. **Real AI work involves real, hard-to-reverse decisions** — which model/provider, what data pipeline, what it costs per inference, what latency budget, whether it runs synchronously in a request or as a background job. These are not "pick a sensible default and proceed" decisions the way "which dashboard panel to add next" was for Phase 3.
2. **This codebase's own convention is: define a port next to its first real consumer.** `HashService` exists because `submitAdvisorApplication` needed it immediately. A speculative `AIInsightsService` interface with zero callers would be dead code dressed up as preparation — worse than not having it, because it creates false confidence that "the architecture is ready" when actually nobody has decided what the interface should even look like.
3. **What *has* been done instead**: made sure the data substrate (the event log, plus two Phase 4 prep features) is in good shape, so that whenever a real AI feature does get scoped, it's additive — new projections, new ports next to their consumers — not a schema migration.

**When you pick this up: get an explicit answer to "which capability, and how" before writing any AI-adjacent code.** The three capabilities below are the ones named in the original founding brief; none has been scoped.

---

## What already exists that a future AI feature would consume

### 1. The event log (`analytics_events`) — the primary substrate
Every event carries a versioned envelope (`eventVersion`, `schemaVersion`, `source`, `platform`, `environment` — see [ARCHITECTURE.md](./ARCHITECTURE.md)). This means:
- Old events are never rewritten, so a training pipeline reading historical data doesn't need to handle silent schema drift within one `eventVersion`.
- `environment` lets a pipeline filter out `development`/`staging` noise from `production` training data without a separate flag or table.
- ~40 event verbs already capture buyer intent (`buyer_signup` with `intent`/`budget`/`timeline`/`stage`), advisor behavior (`call_accepted`/`call_declined` with `responseSec`), and qualitative buyer feedback (`review_submitted` with `concernTags`, `confidenceShift`) — this is real, structured signal, not just page-view telemetry.

### 2. `project()` and its extensions — the feature-engineering layer that already exists
`src/core/application/projections/project.ts` and `trend.ts` already compute, from the raw log:
- `advisorConversion` (view → request → completed funnel per advisor) — a ready-made feature for an advisor-ranking model.
- `advisorExpertise` (delivered projects + buyer concern tags per advisor) — a ready-made feature for topic-matching.
- `liquidityByProject` (demand/supply ratio per project) — a ready-made feature for expansion/recruitment prediction.
- Week-over-week trend deltas (`comparePeriod`) — a ready-made feature for time-series forecasting inputs.

**Any future AI feature should read from these projections, or extend `project()` with a new one, before reaching for raw event replay.** Don't duplicate feature-engineering logic between `project()` and a future ML pipeline.

### 3. Document intelligence seams (`VerificationDocument`)
`contentHash` (real, computed), `ocrStatus`/`aiProcessingStatus` (honest `"pending"`, ready to flip), `retrievalTags` (unpopulated). See [DATABASE.md](./DATABASE.md).

### 4. What does NOT exist
- No vector store / embeddings infrastructure.
- No LLM API integration anywhere in the codebase.
- No background job runner (no Cloud Functions, no queue) — any AI pipeline needs this built first or alongside.
- No feature store beyond `project()`'s in-memory computation — fine for dashboard-scale reads, not necessarily fine for a real-time recommendation API's latency budget.

---

## The three named capabilities — what scoping each one actually requires

### A. Demand / supply prediction
*"Which projects will see rising demand? Which cities are growing fastest? Where should we recruit advisors?"*

- **Data available today**: `liquidityByProject`, `demandByProject`, `demandByCity`, and now week-over-week trend deltas — all from Phase 3.
- **What's missing to make this "AI" rather than a dashboard trend line**: a forecasting model (even a simple moving-average or linear-regression baseline is a legitimate first step — this does not require an LLM). Needs: (1) a decision on where the model runs (Cloud Function, or a separate Python service if the team wants scikit-learn/Prophet-style tooling rather than a JS-only stack), (2) a decision on refresh cadence (daily batch is almost certainly sufficient), (3) a new `DemandForecastRepository`-style read-model, written by whatever computes the forecast, read by a new Founder Dashboard panel.
- **Recommended first step if scoped**: a simple baseline (e.g., % change over the last 3 comparable periods) computed as a `project()` extension — genuinely useful, zero new infrastructure, and gives a real baseline to beat before investing in a real model.

### B. Advisor / buyer recommendations
*"Which advisor should this buyer talk to? Which buyers should this advisor be shown to?"*

- **Data available today**: `advisorConversion`, `advisorExpertise`, buyer signup intent (`demandByBudget`, `demandByCity`, targetProject).
- **What's missing**: a matching/ranking function. This is the capability most likely to *not* need an LLM — a rules-based or simple collaborative-filtering ranking (advisor expertise tags ∩ buyer concern tags, weighted by conversion rate) could ship before any ML model, and would itself generate labeled data (did the recommended advisor convert?) for a future learned ranker.
- **Recommended first step if scoped**: a deterministic ranking function in `core/application` (pure, testable, no new infrastructure) that scores active advisors for a given buyer's stated intent, surfaced as a "Recommended for you" section on the buyer search page. This is a real Phase 3-style extension, not a Phase 4 AI investment, and should probably be built *before* a learned model, not instead of documenting one here.

### C. Conversation intelligence
*"What themes/sentiment show up across reviews and calls at scale?"*

- **Data available today**: `review_submitted` events with `concernTags` (already structured) and free-text `comment`. Call *recordings* do not exist (no real `CallService` adapter yet — see ROADMAP.md), so there is no call transcript data to mine yet.
- **What's missing**: this is the one capability that genuinely needs an LLM (sentiment/theme extraction over free text at scale isn't a simple heuristic). Needs an explicit decision on: which provider/API (this is the "real, hard-to-reverse decision" flagged above — cost, data residency for sending buyer review text to a third party, latency), whether it runs synchronously (bad idea — reviews are already fire-and-forget) or as a background job (needs a job runner, which doesn't exist yet), and where results get stored (a new field on `Review`, or a separate `review_insights` collection so raw reviews stay simple).
- **Recommended first step if scoped**: do NOT start here. This capability has the most unresolved infrastructure dependencies (job runner, LLM provider decision, cost model) of the three. Building A or B first would also produce the job-running/read-model patterns this capability could then reuse.

---

## Architectural guidance for whoever builds the first real Phase 4 feature

1. **Define the port next to the use case that calls it.** Do not add `AIInsightsService` (or similar) to `core/application/ports` speculatively. If you're building capability B above, the port might be called `AdvisorRankingService` and live next to a new `rankAdvisorsForBuyer` use case.
2. **Prefer extending `project()` over building parallel feature-engineering code**, for anything that's a deterministic aggregation (A and B above are both mostly this).
3. **If a model genuinely needs to run somewhere other than a Next.js API route** (training, batch scoring, LLM calls with real latency), that's the forcing function to finally add Cloud Functions or a separate worker — don't shoehorn it into the request/response cycle.
4. **Treat any third-party AI API call as its own port**, exactly like `PaymentGateway`/`CallService` — a placeholder-first adapter pattern lets you ship the surrounding feature (UI, data model, use case) before the provider decision is finalized, and swap providers later without touching business logic.
5. **Log the decision in [ENGINEERING_DECISIONS.md](./ENGINEERING_DECISIONS.md)** when you make it — provider choice, cost model, and why, the same way every other cross-cutting decision in this codebase has been recorded.
