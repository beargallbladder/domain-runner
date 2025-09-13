PRD: Prompt Catalog v1

Mission
Maintain a versioned catalog of prompts used by the system.
Prompts can be generic, brand-specific, or category-specific.
Catalog ensures traceability, reproducibility, and safe experimentation.

Inputs
- Prompt definition JSON (manual add or API):
  - prompt_id (string, unique)
  - text (string, may contain {domain} placeholder)
  - task (enum: brand, domain, category, other)
  - variant (optional string, e.g. A, B, test)
  - version (semver string, default 1.0.0)
  - safety_tags (list of strings, e.g. ["PII-safe","no-financial"])
  - created_by (string)
  - created_at (timestamp, auto)

Outputs
- Table: prompt_catalog
  - Stores latest active version of each prompt.
- Table: prompt_versions
  - Append-only history of all versions.
- Event: prompt_catalog.updated
  - Emitted when new/updated prompts are committed.
  - Triggers LLM Query Runner (A1).

Core Behaviors
1) Validation — All prompts must pass schema check before insert.
2) Versioning — If text or task changes, bump version (semver).
3) Lookup — Support fetch by prompt_id, by task, or by version.
4) Auditability — Every update recorded in prompt_versions.
5) Safety tagging — All prompts must have at least one safety tag.

Non-goals
- Executing prompts (done by A1).
- Optimizing prompts via AI (future).

Success Criteria
- 100% of prompts validate against schema.
- Event fires on every catalog change.
- Lookups deterministic (same input → same version returned).

Golden Tests
- T1 Add Prompt — Insert new prompt → catalog has row, version=1.0.0.
- T2 Update Prompt — Change text → new version (1.1.0), old version archived.
- T3 Schema Enforcement — Missing required field → reject, log error.
- T4 Safety Tags — Prompt without tags → reject, log error.
- T5 Lookup — Fetch by prompt_id → returns latest version only.

Schema
- /schemas/prompt.schema.json

CI Gates
- pytest agents/prompt-catalog/tests all green
- coverage >= 90%
- jsonschema validation passes
- allowlist clean

PRD: Prompt Catalog v1