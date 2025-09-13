# SPARC — Domain Registry & Admin API (Rust)

## S — Specification

**Goal**
Provide a canonical registry of domains used by the crawler: **add/remove**, **bulk import/export**, **tag/segment**, and **paginate** to **≥10k domains** (design for 50k+). Expose a read API for the crawler. Use Postgres + Redis cache; no NATS. Keep current 3k+ domains intact.

**Operations**

* **Create/Upsert** single domain.
* **Bulk import** (CSV or NDJSON stream).
* **Soft delete / restore** (`active` flag).
* **Tagging** (`tags` JSONB, e.g., `{"category":"brand","priority":"high","segment":["top100"]}`).
* **List** (pagination, filters by tags/segment/active).
* **Export** (CSV/NDJSON).
* **Audit**: created_by, updated_by, reason (optional fields).

**Constraints & Scale**

* 10k domains is baseline; performance target: list page (limit 1k) in < 200ms p95.
* Imports up to 100k lines must stream; memory bounded.
* All writes must **invalidate** Redis caches.

**Data Contract (additive)**

```sql
-- Existing table
-- domains(id UUID PK, domain VARCHAR UNIQUE NOT NULL, created_at, updated_at)

ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(active);
CREATE INDEX IF NOT EXISTS idx_domains_tags ON domains USING GIN(tags);
```

**Auth**

* Simple `ADMIN_API_KEY` header for write endpoints (initial).
* Read endpoints can be open or constrained behind key (configurable).

**Acceptance Criteria**

* Import 10k domains (CSV) in ≤ 2 minutes without OOM.
* Pagination stable & correct with filters; no duplicates.
* Soft delete respected by crawler (active=true).
* Cache invalidation works (list reflects changes immediately).
* CI green; `/healthz` returns 200.

---

## P — Pseudocode

```
POST /domains (single)
  input = {domain, tags?}
  d = normalize(domain)  # lowercase, punycode
  upsert domains(d, active=true, merge tags)
  invalidate_list_caches()
  return {id, domain, active, tags}

POST /domains/import (CSV or NDJSON stream)
  for each record:
    d = normalize(record.domain)
    upsert domains(d, active=true, merge tags)
    if new: enqueue async dns_check(d)   # optional
  invalidate_list_caches()
  return { imported, updated, skipped }

PATCH /domains/{id}
  apply changes (active, tags merge, reason)
  invalidate_list_caches()
  return updated row

GET /domains
  query = {active?, tags?, segment?, limit, cursor}
  if cached(page_key): return cache
  rows = select ... order by domain limit :limit offset :cursor
  cache(page_key, ttl=60s)
  return {items, next_cursor}

GET /domains/export?format=csv|ndjson
  stream rows (no buffering all in memory)
```

---

## A — Architecture

**Service**

* `domain-registry-api` (Axum) with:

  * `GET /healthz`
  * `GET /domains` (filters: `active`, `tag.k=v`, `segment=...`, `limit`, `cursor`)
  * `POST /domains` (single upsert)
  * `POST /domains/import` (multipart CSV or NDJSON; streaming parser)
  * `PATCH /domains/{id}` (active/tags)
  * `GET /domains/export` (CSV/NDJSON stream)

**Modules**

* **Normalizer** — lowercases, IDNA/punycode, dedup.
* **Importer** — stream parser, idempotent upsert by normalized domain.
* **Paginator** — keyset or cursor-based pagination (prefer keyset on `domain`).
* **Cache** — Redis page cache `cache:domains:list:{hash(filters)}`; TTL 60s; invalidated on writes.
* **Auth** — simple key middleware for mutating routes.
* **Repository** — SQLx queries; prepared statements; connection pool.

**Config (env)**

```
DATABASE_URL, REDIS_URL, RUST_LOG=info
ADMIN_API_KEY=...  (required for POST/PATCH/IMPORT)
PAGE_DEFAULT_LIMIT=250
PAGE_MAX_LIMIT=1000
```

**Performance**

* Pagination: keyset (WHERE domain > :last_domain ORDER BY domain LIMIT :n) for large sets.
* Import: batch every N rows (e.g., 500) or single upserts with connection pool; avoid huge transactions.

---

## R — Refinement

* **Segments** — store segment lists in `tags.segment: [..]`; add convenient `segment=` filter.
* **DNS/HTTP checks** — optional background verifier with retry; store status in tags `{ "dns":"ok" }`.
* **Bulk deletes/restores** — endpoints to toggle `active` for many IDs.
* **Auth v2** — JWT or OAuth proxy if needed.
* **Keyset pagination everywhere** — switch fully once callers support it.
* **Rate limiting** — simple per-IP for write endpoints.

---

## C — Completion (Definition of Done)

* **Tests**

  * Unit: normalization, tags merge, auth guard.
  * Integration: import 10k CSV stream; pagination correctness; cache invalidation.

* **Docs**

  * API usage examples (curl) for import/export and filters.

* **Ops**

  * Dashboard counters: total active domains, imports/min, error rate.
  * Health check returns `ok`.

* **Sign-off**

  * Crawler consumes `GET /domains` with filters and meets SLA using this list.
  * CI green; endpoints verified on Render `/healthz`.