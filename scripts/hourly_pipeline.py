import os, sys, json, time
from datetime import datetime, timedelta, timezone

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.llm_query_runner.src.runner import LLMQueryRunner
from agents.run_manifest.src.manifest_manager import RunManifestManager
from agents.response_normalizer.src.run_normalizer_job import main as run_norm
from agents.sentinel.src.run_sentinel_job_db import main as run_sentinel
from agents.llm_query_runner.src.providers.registry import load_runtime, build_clients

def expected_tuples(domains, prompts, models):
    for d in domains:
        for p in prompts:
            for m in models:
                yield (d, p["prompt_id"], m)

def main():
    runtime = load_runtime()
    models = [cfg["model"] for name,cfg in runtime["providers"].items() if cfg.get("enabled")]
    # Replace with your real domain/prompt sources:
    domains = ["openai.com","anthropic.com"]
    prompts = [{"prompt_id":"P1","text":"What does {domain} do?"}]
    exp = list(expected_tuples(domains, prompts, models))
    now = datetime.now(timezone.utc)
    m = RunManifestManager(min_floor=0.70, target_coverage=0.95)
    run = m.create_manifest(window_start=now - timedelta(minutes=60), window_end=now, expected_combos=exp)
    rid = run["run_id"]
    runner = LLMQueryRunner(config_path="config/runtime.yml")
    # A1 execute (mocked or real via runtime.yml)
    rows, errs = runner.run_batch(domains, prompts, models)
    runner.persist_rows(rows)
    # A3 normalize
    run_norm()
    # A5 sentinel
    run_sentinel()
    # close manifest
    closed = m.close_manifest(rid)
    print(json.dumps({"tier":closed["tier"], "coverage":closed["coverage"], "run_id":rid}, indent=2))
    if closed["tier"]=="invalid":
        sys.exit(2)

if __name__=="__main__":
    main()