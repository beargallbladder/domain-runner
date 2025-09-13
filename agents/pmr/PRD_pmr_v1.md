# PRD_12 — Provider & Model Registry (PMR) v1

## Mission

Continuously maintain an **authoritative registry** of providers/models and call contracts:

* Validate **availability**, **recency**, and **deprecation** status.
* Verify **API parameters** and **response contracts** via live canaries.
* Emit **roadmap actions** (add/upgrade/deprecate), open issues, and update `runtime.yml`.
* Gate merges and schedules so only **healthy** models get routed.

## Inputs

* `config/runtime.yml` (desired/active providers & models).
* Env keys (which providers are actually usable).
* Provider metadata endpoints (when available) or documented catalogs.
* Health from your system: success rate, latency, 429/5xx, cost per call (from A1/telemetry).
* MPM policy (coverage/budget floors), MII SLA.

## Outputs

* `provider_registry` (table/artifact): current models with status, parameters, last-checked.
* `api_contract_tests` (artifact): last canary results per model (OK/FAIL + reason).
* `pmr.change_proposals` (queue): add/upgrade/deprecate actions with evidence.
* Events: `pmr.registry.updated`, `pmr.contract.broken`, `pmr.deprecation.alert`.

## Core Behaviors

1. **Discovery & Diff**
   * For each enabled provider: fetch model catalog (if endpoint exists), or use curated spec.
   * Diff against `runtime.yml`; detect **new**, **changed**, **missing/deprecated** models.

2. **Contract Validation (Canaries)**
   * Run tiny **read-only** canaries with strict budgets:
     * Parameter matrix (temperature, max_tokens, top_p/top_k, tooluse flag if applicable).
     * Response contract (must return text; schema compatibility for your pipeline).
   * Record pass/fail with error codes and minimal snippets.

3. **Policy Decisions**
   * **Add proposal** when a new model has better value (reliability/latency/cost) or fills MPM coverage gaps.
   * **Upgrade proposal** when provider announces replacement ("use model-X-2025-06 instead of 2024-12").
   * **Deprecate proposal** when model disappears from catalog, shows sustained failures, or provider marks EOL.

4. **Runtime Enforcement**
   * Update a **generated, versioned** `providers.generated.yml` (don't hand-edit) with the canonical call parameters (endpoints, max_tokens caps, version IDs).
   * Open PR to bump `config/runtime.yml` via code-mod with rationale.
   * Fail gates if a **removed/EOL** model is still referenced anywhere.

5. **Observability**
   * Keep rolling SLOs per model: success %, P50/P95 latency, cost/call, 429 rate.
   * Downgrade traffic (and file proposals) when SLOs breach thresholds.

6. **Auditability**
   * Every change (add/upgrade/deprecate) requires a PR with the **ΔMII@budget** and **MPM plan impact**.
   * Store proofs: provider metadata snapshot, canary logs, before/after configs.

## Success Criteria

* Registry refresh runs on schedule; **no stale entries > 7 days**.
* Contract tests catch parameter/endpoint breaks before production.
* EOL models never remain in `runtime.yml` after deprecation grace window.
* MPM receives actionable proposals with evidence; MCP can auto-approve low-risk upgrades inside budget.

## Golden Tests

* **T1 Discovery Diff:** mock provider catalog with new+missing models → registry marks add/deprecate correctly.
* **T2 Contract Matrix:** bad parameter (e.g., too large `max_tokens`) → canary FAIL with clear error.
* **T3 EOL Gate:** model flagged EOL → proposal emitted and CI gate fails if still routed in `runtime.yml`.
* **T4 Upgrade Path:** replacement model advertised → `upgrade` proposal with same prompts, evidence, and A/B plan.
* **T5 Budget-Aware Trial:** proposals for new models include **trial traffic %**, estimated cost, and **ΔMII** expectation.