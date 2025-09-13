# Build 7 — Guardrailed Ruvnet/Nexus Scaffold + A1 LLM Query Runner

## Quick Start (local)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
make ci
python agents/llm-query-runner/src/main_demo.py
```

## Golden Tests

* T1: basic two-model execution and idempotency
* T2: timeouts retried and marked failed
* T3: malformed responses stored/flagged
* T4: deterministic PK per minute bucket

## Merge Policy

* All PRs must reference a PRD.
* CI must be green; coverage >= 90%.
* Modifications outside allowlist are blocked.