#!/usr/bin/env python3
"""
PMR (Provider & Model Registry) Demo
Shows the complete flow of discovery, validation, and proposal generation.
"""

import os
import sys
import json

# Add paths
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pmr_path = os.path.join(project_root, "agents", "pmr", "src")
sys.path.insert(0, pmr_path)

from registry import discover, diff_with_runtime, save_registry
from canaries import run_canaries, validate_contracts, save_canary_results
from propose import propose, filter_proposals, save_proposals
from codemod import generate_providers_config, save_generated_config

def main():
    print("=" * 60)
    print("Provider & Model Registry (PMR) Demo")
    print("=" * 60)

    # Step 1: Discovery
    print("\n[Step 1] Discovering models from provider catalogs...")
    registry = discover()
    save_registry(registry, "artifacts/provider_registry.json")

    # Show summary
    by_provider = {}
    for r in registry:
        p = r["provider"]
        by_provider[p] = by_provider.get(p, 0) + 1

    print(f"  Found {len(registry)} models across {len(by_provider)} providers:")
    for provider, count in sorted(by_provider.items()):
        print(f"    {provider}: {count} models")

    # Step 2: Diff with runtime
    print("\n[Step 2] Comparing with runtime.yml...")
    diff = diff_with_runtime(registry)
    print(f"  New models available: {len(diff['new'])}")
    print(f"  Deprecated models in use: {len(diff['deprecated'])}")
    print(f"  Missing from registry: {len(diff['missing'])}")

    if diff['deprecated']:
        print("\n  ⚠️  Action needed - deprecated models:")
        for d in diff['deprecated'][:3]:
            print(f"    - {d['provider']}/{d['model']}")

    # Step 3: Contract validation (limited for demo)
    print("\n[Step 3] Running canary contract tests...")
    print("  (Limited to 3 calls for demo)")
    contracts = run_canaries(registry, max_calls=3)
    save_canary_results(contracts, "artifacts/contract_results.json")

    summary = validate_contracts(registry)
    print(f"  Tested: {summary['passed'] + summary['failed']} models")
    print(f"  Passed: {summary['passed']}")
    print(f"  Failed: {summary['failed']}")

    # Step 4: Generate proposals
    print("\n[Step 4] Generating change proposals...")
    proposals = propose(registry, contracts)
    proposals = filter_proposals(proposals, max_budget_delta=10.0)
    save_proposals(proposals, "artifacts/pmr_proposals.json")

    by_action = {}
    for p in proposals:
        action = p["action"]
        by_action[action] = by_action.get(action, 0) + 1

    print(f"  Generated {len(proposals)} proposals:")
    for action, count in sorted(by_action.items()):
        print(f"    {action}: {count}")

    # Show high-impact proposals
    if proposals:
        print("\n  Top proposals by MII impact:")
        sorted_props = sorted(proposals, key=lambda x: abs(x["impact"]["delta_mii"]), reverse=True)
        for p in sorted_props[:3]:
            impact = p["impact"]
            print(f"    - {p['action']} {p['provider']}/{p['model']}")
            print(f"      ΔMII: {impact['delta_mii']:.1f}, ΔBudget: ${impact['budget_delta']:.2f}/hr")

    # Step 5: Generate providers.generated.yml
    print("\n[Step 5] Generating providers.generated.yml...")
    config = generate_providers_config(registry, contracts, proposals)
    save_generated_config(config, "config/providers.generated.yml")

    active_models = 0
    for provider, pdata in config["providers"].items():
        active_models += len([m for m, mdata in pdata["models"].items()
                             if mdata.get("status") == "active"])

    print(f"  Generated config with {active_models} active models")

    print("\n" + "=" * 60)
    print("PMR Demo Complete!")
    print("\nNext steps:")
    print("1. Review proposals in artifacts/pmr_proposals.json")
    print("2. Check generated config in config/providers.generated.yml")
    print("3. Apply suggestions to runtime.yml if appropriate")
    print("4. Set up scheduled runs via Nexus runbook")

if __name__ == "__main__":
    main()