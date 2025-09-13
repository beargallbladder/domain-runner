# PRD_M1 Run Manifest & Checkpoint Manager v1

## Mission

Replace brittle "all-or-nothing" execution with **fault-tolerant, checkpointed runs** that track completeness explicitly and enable tiered degradation modes while protecting MII integrity.

## Inputs

* **Expected combinations** from A2 (Prompt Catalog)
  * `[(domain, prompt_id, model)]` for the time window
* **Observation results** from A1 (LLM Query Runner)
  * Success/failure status per combination
* **Configuration**
  * `min_floor` (e.g., 0.70) - Below this, no Tensor/MII update
  * `target_coverage` (e.g., 0.95) - Above this, fully healthy
  * `max_retries` (e.g., 3) - Per observation retry limit

## Outputs

* **`run_manifest` table**
  * `run_id`, `window_start`, `window_end`, `target_combos`, `min_floor`, `target_coverage`
  * `observed_ok`, `observed_fail`, `coverage`, `tier`, `status`

* **`observation_status` table**
  * `run_id`, `domain`, `prompt_id`, `model`
  * `status` (queued|running|success|failed|skipped)
  * `attempts`, `last_error`, `latency_ms`, `response_id`

* **Events**
  * `manifest.opened` - New run started
  * `manifest.closed` - Run completed with tier
  * `gapfill.ready` - Missing combos need backfill
  * `tensor.ready` - Data ready for tensor computation
  * `mii.skipped` - Coverage below floor

## Core Behaviors

1. **Manifest Creation**
   * Generate expected combo set from active prompts × domains × models
   * Initialize all observations as `queued`
   * Set floor and target thresholds

2. **Observation Tracking**
   * Track each LLM call: queued → running → success/failed
   * Count attempts, store errors
   * Link successful responses to A1 response_id

3. **Coverage Calculation**
   * `coverage = observed_ok / target_combos`
   * Continuous updates during run

4. **Tier Assignment**
   * `coverage < min_floor` → Tier 0 `invalid` → Block downstream
   * `min_floor ≤ coverage < target` → Tier 1 `degraded` → Compute with penalty
   * `coverage ≥ target` → Tier 2 `healthy` → Normal computation

5. **Checkpoint & Recovery**
   * Save state after each batch
   * Resume from last checkpoint on failure
   * Emit gap-fill tasks for missing data

6. **Quality Gates**
   * Refuse Tensor/MII updates for Tier 0
   * Apply coverage penalty for Tier 1
   * Track validity flags per cell

## Non-Goals

* Re-running successful observations
* Modifying retry strategies (that's MPM)
* Computing MII scores (that's A11)

## Success Criteria

* Zero "all-or-nothing" failures
* 100% of runs complete with explicit tier
* Gap-fill events for all missing combos
* Tensor/MII respect coverage floors
* Full audit trail of observation attempts

## Golden Tests

* **GT1 Floor Enforcement** - coverage=0.69, floor=0.70 → tier=invalid, no tensor update
* **GT2 Degraded Path** - coverage=0.85, target=0.95 → tier=degraded, tensor with flags
* **GT3 Healthy Path** - coverage=0.96, target=0.95 → tier=healthy, normal flow
* **GT4 Partial Provider Failure** - One model 0% success → system continues if coverage≥floor
* **GT5 Checkpoint Recovery** - Resume from checkpoint after crash, no duplicate work
* **GT6 Gap Detection** - Missing combos correctly identified and queued