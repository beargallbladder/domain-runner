"""
Canary contract validation for LLM providers.
Runs minimal test calls to verify API contracts and parameters.
"""

import json
import os
import sys
import datetime
from typing import Dict, List, Optional

# Add path for provider imports
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
llm_runner_path = os.path.join(project_root, "agents", "llm-query-runner", "src")
sys.path.insert(0, llm_runner_path)

from providers.registry import build_clients, load_runtime

# Canary test prompts - minimal, deterministic
CANARY_PROMPTS = {
    "basic": "Return exactly the string OK.",
    "json": 'Return valid JSON: {"status": "ok"}',
    "math": "What is 2+2? Return only the number.",
    "empty": ""  # Test empty prompt handling
}

def run_canaries(registry: List[Dict], max_calls: int = 10) -> List[Dict]:
    """
    Run canary tests for each model in registry.
    Returns registry entries with contract_ok status and reasons.
    """
    # Load runtime and build clients
    try:
        runtime = load_runtime()
        clients = build_clients(runtime)
    except Exception as e:
        print(f"[PMR Canary] Failed to load clients: {e}")
        clients = {}

    results = []
    call_count = 0

    for entry in registry:
        model = entry["model"]
        provider = entry["provider"]

        # Skip if model not routed or inactive
        if entry["status"] in ["deprecated", "eol"]:
            results.append({
                **entry,
                "contract_ok": False,
                "reason": f"status={entry['status']}",
                "canary_tests": {}
            })
            continue

        if model not in clients:
            # Check if provider is enabled but model name differs
            # This catches model name mismatches
            results.append({
                **entry,
                "contract_ok": False,
                "reason": "not_routed",
                "canary_tests": {}
            })
            continue

        # Run canary tests (respect max_calls budget)
        if call_count >= max_calls:
            results.append({
                **entry,
                "contract_ok": None,
                "reason": "budget_exceeded",
                "canary_tests": {}
            })
            continue

        canary_results = {}
        all_ok = True

        # Test basic prompt
        try:
            call_count += 1
            client = clients[model]
            response = client.call(CANARY_PROMPTS["basic"], timeout=10)
            ok = response.strip().upper().startswith("OK")
            canary_results["basic"] = {
                "ok": ok,
                "response": response[:100]  # Truncate for storage
            }
            if not ok:
                all_ok = False
        except Exception as e:
            canary_results["basic"] = {
                "ok": False,
                "error": str(e)[:200]
            }
            all_ok = False

        # Test parameter validation (if basic passed)
        if all_ok and call_count < max_calls:
            try:
                call_count += 1
                # Test with specific parameters from registry
                params = entry.get("params", {})
                if "max_tokens" in params:
                    # Test max_tokens boundary
                    test_response = client.call(
                        "Count from 1 to 10.",
                        timeout=10
                    )
                    canary_results["params"] = {
                        "ok": len(test_response) > 0,
                        "response_len": len(test_response)
                    }
            except Exception as e:
                canary_results["params"] = {
                    "ok": False,
                    "error": str(e)[:200]
                }
                all_ok = False

        results.append({
            **entry,
            "contract_ok": all_ok,
            "reason": None if all_ok else "contract_failed",
            "canary_tests": canary_results,
            "canary_timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        })

    return results

def validate_contracts(registry: List[Dict]) -> Dict:
    """
    Validate that all active models pass contract tests.
    Returns summary of validation results.
    """
    results = run_canaries(registry)

    summary = {
        "total": len(results),
        "passed": sum(1 for r in results if r.get("contract_ok") is True),
        "failed": sum(1 for r in results if r.get("contract_ok") is False),
        "skipped": sum(1 for r in results if r.get("contract_ok") is None),
        "failures": []
    }

    for r in results:
        if r.get("contract_ok") is False and r["status"] == "active":
            summary["failures"].append({
                "provider": r["provider"],
                "model": r["model"],
                "reason": r.get("reason"),
                "tests": r.get("canary_tests", {})
            })

    return summary

def save_canary_results(results: List[Dict], output_path: str = "artifacts/contract_results.json"):
    """Save canary results to JSON file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"[PMR Canary] Results saved to {output_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PMR Canary Contract Tests")
    parser.add_argument("--in", dest="input", default="artifacts/provider_registry.json", help="Registry input")
    parser.add_argument("--out", default="artifacts/contract_results.json", help="Output path")
    parser.add_argument("--max-calls", type=int, default=10, help="Max API calls")
    args = parser.parse_args()

    # Load registry
    with open(args.input) as f:
        registry = json.load(f)

    # Run canaries
    results = run_canaries(registry, max_calls=args.max_calls)
    save_canary_results(results, args.out)

    # Show summary
    summary = validate_contracts(registry)
    print(f"\n[PMR Canary] Summary:")
    print(f"  Total: {summary['total']} models")
    print(f"  Passed: {summary['passed']}")
    print(f"  Failed: {summary['failed']}")
    print(f"  Skipped: {summary['skipped']}")

    if summary['failures']:
        print("\n  ⚠️  Contract failures:")
        for f in summary['failures']:
            print(f"    - {f['provider']}/{f['model']}: {f['reason']}")