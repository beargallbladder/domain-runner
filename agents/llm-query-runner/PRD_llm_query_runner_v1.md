PRD: LLM Query Runner v1

Mission
Run (domain × prompt × model) calls to LLM APIs. Log raw responses with schema validation and retries.

Inputs
- domains: list[str] (from Domain Seeder)
- prompts: [{prompt_id, text, variant, task}]
- models: ["gpt-4o", "claude-3.5", "deepseek-v3"] (config)

Outputs
- Table: responses_raw
  - id (uuid), domain, prompt_id, model, ts_iso, raw, status ("success|failed|timeout"), latency_ms, attempt
- Event: llm_query.error (payload: domain, prompt_id, model, reason)

Core Behaviors
1) Dispatch jobs for each (domain,prompt,model)
2) Retry ≤3 with exponential backoff on 429/5xx/timeouts
3) Validate output: must parse into { answer: str | "" } (store raw regardless)
4) Idempotency: PK = hash(domain,prompt_id,model,ts_bucket_minute)

Success Criteria
- 100% jobs produce a row (success or failure)
- Timeouts/failures retried ≤3
- P95 latency measured
- Zero schema validation failures in CI

Golden Tests
- T1 Basic: 1 domain × 1 prompt × 2 models → 2 success rows, non-empty raw
- T2 Timeout: simulate timeout → status in {"timeout","failed"}, attempts <=3
- T3 Schema: malformed (empty) returns → stored, status="failed"
- T4 Idempotency: rerun in same minute → no duplicate PKs

Schemas
- /schemas/responses_raw.schema.json

CI Gates
- pytest agents/llm-query-runner/tests all green
- coverage >= 90%
- jsonschema validation passes
- allowlist clean

PRD: LLM Query Runner v1