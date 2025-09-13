# PRD_L1 — Legacy → New Schema Mapper (Backfill Loader) v1

## Mission

Safely **ingest legacy data** into the new pipeline by transforming old rows into:
* `responses_raw` (A1 schema)
* `responses_normalized` (A3 schema)

Do this **read-only**, **idempotently**, and with full **provenance**.

## Inputs

* One or more **legacy sources** (Postgres/BigQuery/CSV/NDJSON). Expected legacy fields (examples):
  * `timestamp`, `model_name`, `prompt_text`, `domain`, `raw_response` (text/blob), `status`, `latency_ms`, `run_id`, `job_name`
* **Mapping config** (YAML/JSON) describing field mappings, transforms, defaults:
  * `legacy.timestamp → ts_iso`
  * `legacy.model_name → model`
  * `legacy.raw_response → raw`
  * `derive prompt_id` (hash of prompt_text or lookup)

## Outputs

* **`responses_raw` rows** (exactly A1 schema)
* **`responses_normalized` rows** (exactly A3 schema)
* **`backfill_provenance` table**
  * `legacy_source_id`, `legacy_primary_key`, `new_id_raw`, `new_id_norm`, `ingested_at`, `mapping_version`, `checksum`

## Core Behaviors

1. **Deterministic IDs**
   * New `responses_raw.id` = UUIDv5/hash of `(apex_domain, prompt_id, model, ts_bucket_minute)` to match A1's idempotency rule.

2. **Prompt ID resolution**
   * If legacy has only `prompt_text`, derive `prompt_id=sha256(prompt_text)`; **store the mapping** for future reconciliation with A2 (Prompt Catalog).

3. **Normalization pass**
   * Run the **same normalizer** as A3 to produce `responses_normalized`. No special logic—reuse A3.

4. **Provenance**
   * Record a row in `backfill_provenance` for every success/failure with checksums of the legacy record.

5. **Idempotency**
   * Re-running the same legacy slice must not create duplicates (PK and checksum gate).

6. **Safety**
   * Start as **READ-ONLY** to legacy; writes only to a **staging** schema/schema-qualified tables; promote to prod after validation.

7. **Performance**
   * Chunked loads (e.g., 2k rows per batch) with resume tokens.

## Non-Goals

* Re-prompting LLMs (that's L2 Replay).
* Vectorizing content (leave to later analytics).

## Success Criteria

* ≥ 99% of legacy rows land in `responses_raw`; malformed rows are quarantined with reasons.
* 100% of outputs validate against JSON Schemas.
* Re-running the same time slice yields **zero additional** committed rows (idempotent).
* Mapping config is versioned; changes produce deterministic diffs.

## Golden Tests

* **T1 Deterministic ID** - Legacy duplicates of the same (domain, prompt_text, model, same minute) map to the **same** `responses_raw.id`.
* **T2 Prompt Mapping** - Two legacy rows with identical `prompt_text` but different models → same `prompt_id`, different `model`, distinct rows.
* **T3 Normalization** - Malformed legacy `raw_response` → `responses_normalized.normalized_status="malformed"` with empty `answer`, not dropped.
* **T4 Idempotent Re-run** - Running the same batch twice produces the same counts and no new IDs; `backfill_provenance` shows a single successful mapping per legacy key.
* **T5 Provenance Checksum** - Altering a legacy record's content (simulated) changes checksum and is detected; second run flags mismatch and quarantines.