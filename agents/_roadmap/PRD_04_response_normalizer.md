# PRD_04 Response Normalizer v1

## Mission

Normalize **raw LLM responses** into a consistent schema with required fields (`answer`, `status`), optional fields (`confidence`, `citations`), and error tagging.
Guarantee that all responses conform to schema for drift detection and tensor building.

---

## Inputs

* **`responses_raw`** (from A1):

  * `id`, `domain`, `prompt_id`, `model`, `ts_iso`, `raw`, `status`, `latency_ms`, `attempt`

---

## Outputs

* **`responses_normalized`** (table):

  * `id` (same as input)
  * `domain`, `prompt_id`, `model`, `ts_iso`
  * `answer` (string, may be `""`)
  * `confidence` (0–1, optional float, default null)
  * `citations` (array of strings, optional, default empty)
  * `normalized_status` (`valid|malformed|empty`)
  * `raw_ref` (foreign key → responses_raw.id)

* **Events:**

  * `response_normalized.error` (payload: `id`, `reason`)

---

## Core Behaviors

1. **Parsing**
   * Attempt JSON parse if `raw` looks like JSON.
   * Else apply regex/safe extraction (e.g., first line as `answer`).
2. **Validation**
   * Must produce at least `{answer: string}`.
   * If parse fails → `answer=""`, `normalized_status="malformed"`.
   * If answer blank → `normalized_status="empty"`.
3. **Confidence handling**
   * Extract if present (`confidence: float`).
   * Clamp to [0,1].
4. **Citations handling**
   * Extract array if present (`citations: []`).
   * Deduplicate & strip whitespace.
5. **Auditability**
   * Always preserve raw via `raw_ref`.
   * Errors → emit `response_normalized.error`.

---

## Non-goals

* Semantic scoring (done in Sentinel).
* Vector embeddings (future).

---

## Success Criteria

* 100% of rows in `responses_raw` yield a `responses_normalized` row.
* Schema validation passes for all outputs.
* Malformed responses flagged, not dropped.
* Tests prove deterministic handling of malformed/empty cases.

---

## Golden Tests

* **T1 Parse Valid JSON** — Given `{"answer":"42","confidence":0.9}`, produce correct fields, status=`valid`.
* **T2 Parse Plain Text** — Given `"OpenAI is an AI company"`, produce `answer="OpenAI is an AI company"`, status=`valid`.
* **T3 Malformed JSON** — Given `"{answer:missing quotes}"`, produce `answer=""`, status=`malformed`, error event emitted.
* **T4 Empty Answer** — Given `"   "`, produce `answer=""`, status=`empty`.
* **T5 Citations Handling** — Input with citations array produces deduped, validated list.

---

## Schema

* `/schemas/responses_normalized.schema.json`

---

## CI Gates

* pytest agents/response-normalizer/tests all green
* coverage >= 90%
* jsonschema validation passes
* allowlist clean

PRD: Response Normalizer v1