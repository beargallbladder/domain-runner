# Sentinel PRD (v1.0.0)

## Objective
Measure AI-memory of brands across LLMs; compute MemoryScore & ConsensusScore; publish APIs + front-end snapshots.

## Scope
- **Crawl**: {targets} × {models} × {prompt_types}
- **Score**: MemoryScore (0..1), ConsensusScore (0..1), Volatility
- **Publish**: /api/v1/memory/:brand, /api/v1/leaderboard
- **Schedule**: cron (UTC) + manual trigger

## Invariants
- Contracts: /interfaces/*.json
- Immutable artifacts under /runs/{run_id}
- Every run must validate schemas and tag spec_version
- All secrets stored in Render environment

## Orchestration
- **Hive**: orchestration/ruvnet/hive.yml
- **Swarms**: crawl.yml → score.yml → publish.yml (strict order)
- **Status**: push run envelope + metrics to RuvNet dashboard
- **Environment**: Pull all API keys from Render service

## CI/CD
- **on-spec-change**: validate PRD, dry-run swarm plan
- **nightly-loop**: execute full loop, collect logs, propose PR updates
- **manual-orchestrate**: dispatch comment `/orchestrate`
- **release & rollback**: tag release, rollback by tag

## Rust Migration Plan (Leaf)
- Feature flag: SERVICE_IMPL=node|rust
- Both implementations conform to /interfaces contracts
- Canary: 5% traffic to rust; raise to 100% on 3 green runs
- Success criteria: error rate <2%, p95 latency within 15% of Node

## SLOs / Alerts
- Error rate < 2%
- Timeout rate < 5%
- LLM response time p95 < 10s
- If violated 2 consecutive runs → status=degraded + open issue

## Dashboard (RuvNet)
- **Panels**: run timeline, error buckets, model call latency, scores by brand, deltas vs last run
- **Metrics**: run_duration_seconds, llm_calls_per_brand, error_rate_by_model
- **Alerts**: Slack/Discord webhook on degraded status

## Parameters (Tunable)
<!-- AUTO-TUNED: Parameters that can be adjusted by propose_spec_update.py -->
- timeout_ms: 30000
- retry_count: 2
- batch_size: 10
- parallel_workers: 4
- cache_ttl_seconds: 3600

## Models Configuration
- OpenAI: gpt-4, gpt-3.5-turbo
- Anthropic: claude-3-opus, claude-3-sonnet
- Google: gemini-pro
- Additional models configurable in specs/models.json

## Error Classification
- timeout: Request exceeded timeout_ms
- rate_limit: 429 or rate limit response
- auth: 401/403 authentication errors
- parse: Invalid JSON or unexpected format
- network: Connection failures
- unknown: Unclassified errors

## Version History
- v1.0.0 (2025-01-17): Initial specification