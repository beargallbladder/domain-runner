# PRD_05 Sentinel v1

## Mission

Detect **memory drift and citation decay** in LLMs by comparing normalized answers across time, prompts, and models.
Flag when a brand/domain disappears, changes significantly, or diverges between peers.

---

## Inputs

* **`responses_normalized`** (from A3)
  * `id`, `domain`, `prompt_id`, `model`, `ts_iso`, `answer`, `normalized_status`
* **Prompt metadata** (from A2)
  * `task`, `variant`, `safety_tags`
* **Comparison config**
  * Time window (e.g. daily, weekly)
  * Drift thresholds (similarity < 0.7, etc.)

---

## Outputs

* **`drift_scores` table:**
  * `drift_id` (UUID)
  * `domain`
  * `prompt_id`
  * `model`
  * `ts_iso`
  * `similarity_prev` (float)
  * `drift_score` (0–1)
  * `status` (`stable|drifting|decayed`)
  * `explanation` (text, optional)

* **Event:**
  * `sentinel.alert` (payload: domain, prompt_id, model, drift_score, status, ts_iso)

---

## Core Behaviors

1. **Baseline selection**
   * For each `(domain,prompt_id,model)`, find previous valid normalized answer in configured window.

2. **Similarity scoring**
   * Compute cosine/text similarity between current and baseline answer.
   * `similarity_prev` = 1.0 if identical, closer to 0.0 if very different.

3. **Drift scoring**
   * `drift_score = 1 - similarity_prev`.
   * Apply threshold:
     * drift_score < 0.3 → `stable`
     * 0.3–0.7 → `drifting`
     * > 0.7 → `decayed`.

4. **Decay detection**
   * If `answer=""` or status=`empty/malformed`, auto mark `decayed`.

5. **Alerting**
   * Emit `sentinel.alert` for statuses drifting/decayed.

6. **Auditability**
   * Store every computation in `drift_scores`.
   * All thresholds/configs versioned in PRD.

---

## Non-goals

* Explaining *why* drift occurred (that's A7 Grounding).
* Cohort/peer comparisons (future).

---

## Success Criteria

* 100% of normalized responses scored.
* Drift detection repeatable (same inputs → same drift score).
* Alerts only fire when thresholds exceeded.
* Golden tests cover stable, drifting, decayed paths.

---

## Golden Tests

* **T1 Stable Answer** — Identical to last run → similarity=1.0, drift_score=0.0, status=`stable`.
* **T2 Minor Drift** — Answer paraphrased → similarity ~0.6, drift_score ~0.4, status=`drifting`.
* **T3 Major Decay** — Answer removed/empty → drift_score=1.0, status=`decayed`.
* **T4 Malformed Case** — Normalized status=`malformed` → auto `decayed`.
* **T5 Threshold Boundary** — Exactly at threshold (0.7) → status=`decayed`.

---

## Schema

**`/schemas/drift_scores.schema.json`**

```json
{
  "$schema":"https://json-schema.org/draft/2020-12/schema",
  "title":"drift_scores",
  "type":"object",
  "required":["drift_id","domain","prompt_id","model","ts_iso","similarity_prev","drift_score","status"],
  "properties":{
    "drift_id":{"type":"string"},
    "domain":{"type":"string"},
    "prompt_id":{"type":"string"},
    "model":{"type":"string"},
    "ts_iso":{"type":"string","format":"date-time"},
    "similarity_prev":{"type":"number","minimum":0,"maximum":1},
    "drift_score":{"type":"number","minimum":0,"maximum":1},
    "status":{"type":"string","enum":["stable","drifting","decayed"]},
    "explanation":{"type":"string"}
  },
  "additionalProperties":false
}
```

---

## Repo Skeleton

```
/agents/sentinel/
  PRD_sentinel_v1.md
  src/
    __init__.py
    drift_detector.py
  tests/
    test_stable.py
    test_drifting.py
    test_decayed.py
```