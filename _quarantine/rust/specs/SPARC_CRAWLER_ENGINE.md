# SPARC — Crawler Engine (Rust)

## S — Specification

**Goal**
Crawl an active domain set against **12 providers** (8 base LLMs + 4 search-enhanced) inside a **1-hour target / 2-hour max SLA window** to preserve tensor stability. Prevent provider blocking, auto-discover new models/names, scale from today's ~3k domains to **≥10k domains** (design for 50k), and write results into the **existing Postgres + Redis** stack (no NATS). Must be trivially extensible to add providers.

**Truth / Constraints**

* Production messaging & cache: **Redis** (Bull/BullMQ today; keep Redis KV & locks).
* Storage: **PostgreSQL** (Render).
* **No NATS in production.**
* DB is brownfield; **migrations must be additive** only.

**Providers (initial 12)**

* **Base (8):** `openai/gpt-4o-mini`, `anthropic/claude-3-haiku`, `google/gemini-1.5-flash`, `deepseek`, `mistral`, `cohere`, `groq`, `ai21/jamba`
* **Search-enhanced (4):** `perplexity/sonar`, `perplexity/sonar-pro`, `perplexity/sonar-large`, `you/search`
* **Extensible:** Provider adapters can be added without touching core scheduler.

**Scale & SLA math (guardrail targets)**

* 10k domains × 12 providers = **120k calls/crawl**.
* 1h target ⇒ ~33.3 req/s sustained; with ~2s p95 latency ⇒ **~67 concurrent**.
* 2h max ⇒ ~16.7 req/s; with ~2s p95 ⇒ **~34 concurrent**.
* Concurrency is **globally capped** and **per-provider capped** (config). Additional API keys per provider may be supplied to raise limits horizontally.

**Inputs**

* Domain list (from Domain Registry API or direct DB read of `domains WHERE active=true`).
* Prompt set & metadata (`prompt_type`, prompt text).
* Provider credentials + per-provider rate limits (env).
* SLA timings, global & per-provider concurrency caps (env).

**Outputs**

* **Postgres** `domain_responses`: one row per (domain, model [, prompt_type]) with response text, scores, timings, retry_count, batch_id.
* **Postgres** `crawl_batches`, `provider_metrics` (aggregated).
* **Redis**: short-lived caches/locks: rate-limit tokens, per-provider breaker state, per-domain crawl locks, consensus cache invalidation keys.

**Data Contracts (brownfield-safe)**
*Additive only; run once prior to first Rust write:*

* Ensure columns on `domain_responses`:
  `prompt_type`, `prompt`, `batch_id`, `response_time_ms`, `quality_flag`, `retry_count`.
* Create (if missing): `crawl_batches`, `provider_metrics`.
* Indexes: `(model)`, `(created_at)`, `(batch_id)` on `domain_responses`.
* **Upsert key:** prefer `(domain_id, model, prompt_type)` if allowed; otherwise keep existing uniqueness and include `prompt_type` in payload without changing constraint.

**Reliability Guardrails**

* **Rate limiting:** token-bucket per provider key (configurable QPS/RPM).
* **Circuit breaker:** open on 429/5xx/error-rate threshold; half-open probes.
* **Retries:** max 2–3 with exponential backoff + jitter; no retry on deterministic errors.
* **Deadlines:** *soft cut* at 60m (drop low-priority prompts), *hard stop* at 120m (drain/finish).
* **Idempotency:** per (domain, provider, prompt_type, batch_id).
* **Cost ceiling:** optional "budget" guard that stops new tasks when estimated spend exceeds cap.
* **Shadow mode:** optional `SHADOW_TABLE=domain_responses_shadow` for A/B parity runs.

**Security**

* API keys via env only; never persisted.
* Domain input validated & normalized; logs scrub PII.
* No shell exec in runtime (policy denies).

**Observability (must-have metrics)**

* Per-provider: success_rate, p50/p95/p99 latency, throttle_rate, error_rate, active_concurrency, breaker_state.
* SLA: queue depth, ETA to target/hard deadlines, dropped tasks.
* DB write latency, rows/sec; Redis ops/sec.
* Cost estimates (if provided by provider or configuration).

**Acceptance Criteria**

* Can crawl **10k domains × 12 providers** within **≤2h**; achieve **≤1h** with tuned concurrency/keys.
* No provider gets blocked under normal rates (breaker + limiter active).
* Writes succeed with **no destructive DB migration**.
* Shadow mode produces comparable rows to current pipeline on the same cohort.
* CI: `cargo build`, `clippy -D warnings`, and integration tests pass.
* Health endpoints respond 200; metrics exported.

**Out of Scope (this module)**

* Alpha/consensus analytics (computed elsewhere); this module only **captures** provider responses + basic per-response metrics.

---

## P — Pseudocode

```
# Initialize
cfg = load_env()
providers = load_provider_adapters(cfg)
domains = DomainSource::from_api_or_db(cfg)
batch_id = new_batch()
deadline_target = now + 60m
deadline_hard   = now + 120m

init rate_limiter[provider_key], circuit_breaker[provider_key]
init global_semaphore = GLOBAL_CONCURRENCY

# Scheduler
for chunk in domains.chunks(CHUNK_SIZE):
  for domain in chunk:
    for provider in providers:
      spawn task:
        if circuit_breaker[provider].is_open(): record_skip(domain, provider); continue
        acquire(global_semaphore)
        acquire(rate_limiter[provider].token())
        with timeout(PROVIDER_TIMEOUT):
          resp = provider.query(domain, prompt_set)
        release(global_semaphore)

        if resp.success:
          upsert_domain_response(domain, provider, resp, batch_id)
          metrics.record_ok(provider, latency=resp.ms)
        else:
          metrics.record_err(provider, resp.err_type)
          if is_throttle_or_5xx(resp): circuit_breaker[provider].maybe_open()
          if should_retry(resp): backoff_jitter(); retry up to MAX_RETRIES

  # SLA enforcement
  if now > deadline_target:
    degrade_mode = true
    reduce per-provider concurrency & drop low-priority prompts
  if now > deadline_hard:
    stop scheduling new tasks; drain and finalize

# Finalize
aggregate_provider_metrics(batch_id)
mark_batch_complete(batch_id)
```

---

## A — Architecture

**Components**

* **Crawler Orchestrator (Tokio service)** — owns scheduling, SLA, deadlines, cost ceiling.
* **Provider Adapters (trait)** — one per provider, encapsulates auth, endpoint, request shaping, error mapping.
* **Model Registry** — canonicalizes provider/model names; optional auto-discover via provider "list models" endpoints; stores reliability weights; exposes `resolve_alias()`.
* **Result Writer** — handles idempotent upsert into Postgres.
* **Limiter/Breaker** — per provider, uses Redis tokens/keys for distributed coordination if horizontally scaled.
* **Admin/Health** (`axum`) — `/healthz`, `/metrics`, `/batch/:id`, `/provider/:name/state`, `/kill-switch`.

**Key Interfaces**

```rust
trait ProviderAdapter {
    fn name(&self) -> &'static str;
    fn supports_search_enhanced(&self) -> bool { false }
    async fn list_models(&self) -> Result<Vec<String>> { Ok(vec![]) } // optional
    async fn query(&self, domain: &str, prompt: &Prompt) -> Result<ProviderResp>;
}

struct ProviderResp {
    text: String,
    latency_ms: u32,
    retry_count: u8,
    quality_flag: Option<String>,
    meta: serde_json::Value,
}
```

**Redis Keys (examples)**

* `rl:{provider}:{key}` — token bucket counters
* `cb:{provider}` — circuit state (closed/open/half-open)
* `lock:crawl:{batch}:{domain}:{provider}` — idempotency lock
* `cache:consensus:{domain}` — (invalidated only; consensus computed elsewhere)

**Deployment**

* One **Background Worker** (can scale horizontally; Redis keys coordinate caps).
* Config via env:

  ```
  DATABASE_URL, REDIS_URL, RUST_LOG=info
  GLOBAL_CONCURRENCY=64
  CRAWL_SLA_TARGET_SECS=3600
  CRAWL_SLA_MAX_SECS=7200
  PROVIDER_TIMEOUT_MS=15000
  COST_BUDGET_USD=   (optional)
  OPENAI_API_KEY=..., ANTHROPIC_API_KEY=..., ... (as applicable)
  ```

---

## R — Refinement (Iteration Plan)

1. **Adaptive Concurrency** — PID-like controller raises/lowers per-provider concurrency from live latency and error rate.
2. **Selective Prompting** — tier prompts; drop Tier-3 at 60m.
3. **Half-open Probing** — controlled probe rate to close breakers.
4. **Batched DB Writes** — use `COPY`/bulk when safe to reduce I/O.
5. **Cost Guard** — estimate per-call, stop early when budget hit.
6. **Auto-Discover Models** — call `list_models()` nightly; update alias map.
7. **Shadow Compare Tooling** — diff outputs vs legacy pipeline for cohort samples.

---

## C — Completion (Definition of Done)

* **Tests**

  * Unit: limiter math, breaker transitions, adapter error mapping, idempotent upsert, deadline logic.
  * Integration: local Postgres & Redis; 100 domains × 3 fake providers; verify SLA and persisted rows.
  * Load: 1k → 5k → 10k domains with stub adapters; meet ≤2h consistently.

* **Ops**

  * Runbook doc: throttle overrides, kill-switch, resume by `batch_id`.
  * Grafana dashboard example or Prometheus queries listed.
  * Health endpoints live and documented.

* **Docs**

  * `/docs/ARCHITECTURE.md` updated: "Postgres + Redis; no NATS; 12 providers; 1–2h SLA".

* **Sign-off**

  * Shadow run over 500–1,000 domains matches legacy outputs materially.
  * CI green: build + clippy + tests.
  * Stakeholder approval to cut over.