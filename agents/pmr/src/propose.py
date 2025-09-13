"""
Change proposal generation for Provider & Model Registry.
Generates add/upgrade/deprecate proposals based on registry and contract status.
"""

import json
import os
import datetime
from typing import Dict, List, Optional

def propose(registry: List[Dict], contracts: List[Dict]) -> List[Dict]:
    """
    Generate change proposals based on registry status and contract results.

    Returns list of proposals with action, reason, evidence, and impact.
    """
    proposals = []
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"

    # Create lookup for contract results
    contract_by_model = {}
    for c in contracts:
        key = f"{c['provider']}/{c['model']}"
        contract_by_model[key] = c

    for r in registry:
        key = f"{r['provider']}/{r['model']}"
        contract = contract_by_model.get(key, {})

        # Rule 1: Deprecate EOL/deprecated models
        if r["status"] in ["deprecated", "eol"]:
            proposals.append({
                "action": "deprecate",
                "provider": r["provider"],
                "model": r["model"],
                "reason": f"Model status is {r['status']}",
                "evidence": {
                    "registry": r,
                    "contract": contract
                },
                "impact": {
                    "delta_mii": -0.5,  # Estimated MII impact
                    "budget_delta": 0.0,
                    "coverage_tier": "degraded"
                },
                "timestamp": timestamp
            })

        # Rule 2: Remove models with failed contracts
        elif contract.get("contract_ok") is False and r["status"] == "active":
            proposals.append({
                "action": "remove",
                "provider": r["provider"],
                "model": r["model"],
                "reason": f"Contract validation failed: {contract.get('reason')}",
                "evidence": {
                    "registry": r,
                    "contract": contract,
                    "canary_tests": contract.get("canary_tests", {})
                },
                "impact": {
                    "delta_mii": -1.0,  # Higher impact for broken models
                    "budget_delta": 0.0,
                    "coverage_tier": "degraded"
                },
                "timestamp": timestamp
            })

        # Rule 3: Suggest upgrades for deprecated models with replacements
        elif r["status"] == "deprecated":
            # Look for newer version from same provider
            newer = find_replacement(r, registry)
            if newer:
                proposals.append({
                    "action": "upgrade",
                    "provider": r["provider"],
                    "model": r["model"],
                    "reason": f"Upgrade to {newer['model']} available",
                    "evidence": {
                        "current": r,
                        "replacement": newer,
                        "contract": contract
                    },
                    "impact": {
                        "delta_mii": 0.2,  # Newer models usually better
                        "budget_delta": calculate_cost_delta(r, newer),
                        "coverage_tier": "healthy"
                    },
                    "timestamp": timestamp
                })

        # Rule 4: Add new high-value models
        elif r["status"] == "active" and contract.get("reason") == "not_routed":
            # Model exists but not in runtime - suggest adding if valuable
            if is_high_value_model(r):
                proposals.append({
                    "action": "add",
                    "provider": r["provider"],
                    "model": r["model"],
                    "reason": "High-value model not currently routed",
                    "evidence": {
                        "registry": r,
                        "capabilities": r.get("capabilities", {}),
                        "cost": r.get("capabilities", {}).get("cost_per_1k_tokens", 999)
                    },
                    "impact": {
                        "delta_mii": estimate_mii_impact(r),
                        "budget_delta": estimate_budget_impact(r),
                        "coverage_tier": "healthy",
                        "trial_traffic_percent": 5  # Start with 5% traffic
                    },
                    "timestamp": timestamp
                })

    return proposals

def find_replacement(deprecated_model: Dict, registry: List[Dict]) -> Optional[Dict]:
    """
    Find replacement model from same provider.
    Usually a newer version with similar name pattern.
    """
    provider = deprecated_model["provider"]
    model_base = deprecated_model["model"].split("-")[0]  # e.g., "claude" from "claude-3-5-sonnet-20240620"

    candidates = []
    for r in registry:
        if (r["provider"] == provider and
            r["status"] == "active" and
            r["model"].startswith(model_base)):
            candidates.append(r)

    # Return newest version (usually has later date in name)
    if candidates:
        return sorted(candidates, key=lambda x: x["model"], reverse=True)[0]

    return None

def is_high_value_model(model: Dict) -> bool:
    """
    Determine if a model is high-value based on capabilities and cost.
    """
    caps = model.get("capabilities", {})
    cost = caps.get("cost_per_1k_tokens", 999)

    # High value criteria:
    # - Low cost (<$0.001 per 1k tokens)
    # - Large context (>100k)
    # - Search augmented
    # - Tool support
    if cost < 0.001:
        return True
    if caps.get("max_context", 0) > 100000:
        return True
    if caps.get("search_augmented"):
        return True

    return False

def calculate_cost_delta(old: Dict, new: Dict) -> float:
    """Calculate budget impact of switching models."""
    old_cost = old.get("capabilities", {}).get("cost_per_1k_tokens", 0)
    new_cost = new.get("capabilities", {}).get("cost_per_1k_tokens", 0)
    # Assume 1M tokens per hour average
    return (new_cost - old_cost) * 1000

def estimate_mii_impact(model: Dict) -> float:
    """Estimate MII impact of adding a model."""
    caps = model.get("capabilities", {})

    # Heuristic: search-augmented models add more value
    if caps.get("search_augmented"):
        return 2.0

    # Low-cost models improve coverage
    cost = caps.get("cost_per_1k_tokens", 999)
    if cost < 0.0005:
        return 1.5
    elif cost < 0.002:
        return 1.0
    else:
        return 0.5

def estimate_budget_impact(model: Dict) -> float:
    """Estimate hourly budget impact of adding a model."""
    cost = model.get("capabilities", {}).get("cost_per_1k_tokens", 0)
    # Assume 5% trial traffic, 100k tokens per hour
    return cost * 100 * 0.05

def filter_proposals(proposals: List[Dict], max_budget_delta: float = 10.0) -> List[Dict]:
    """Filter proposals based on budget and impact constraints."""
    # Sort by MII impact (descending)
    proposals.sort(key=lambda x: x["impact"]["delta_mii"], reverse=True)

    filtered = []
    total_budget_delta = 0.0

    for p in proposals:
        budget_delta = p["impact"]["budget_delta"]
        if total_budget_delta + budget_delta <= max_budget_delta:
            filtered.append(p)
            total_budget_delta += budget_delta

    return filtered

def save_proposals(proposals: List[Dict], output_path: str = "artifacts/pmr_proposals.json"):
    """Save proposals to JSON file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(proposals, f, indent=2)
    print(f"[PMR Propose] {len(proposals)} proposals saved to {output_path}")

if __name__ == "__main__":
    import argparse
    import os

    parser = argparse.ArgumentParser(description="PMR Change Proposals")
    parser.add_argument("--registry", default="artifacts/provider_registry.json", help="Registry input")
    parser.add_argument("--contracts", default="artifacts/contract_results.json", help="Contract results")
    parser.add_argument("--out", default="artifacts/pmr_proposals.json", help="Output path")
    parser.add_argument("--max-budget", type=float, default=10.0, help="Max budget delta per hour")
    args = parser.parse_args()

    # Load inputs
    with open(args.registry) as f:
        registry = json.load(f)

    with open(args.contracts) as f:
        contracts = json.load(f)

    # Generate proposals
    proposals = propose(registry, contracts)

    # Filter by budget
    proposals = filter_proposals(proposals, max_budget_delta=args.max_budget)

    # Save
    save_proposals(proposals, args.out)

    # Show summary
    by_action = {}
    for p in proposals:
        action = p["action"]
        by_action[action] = by_action.get(action, 0) + 1

    print(f"\n[PMR Propose] Summary:")
    for action, count in sorted(by_action.items()):
        print(f"  {action}: {count} proposals")

    # Show high-impact proposals
    high_impact = [p for p in proposals if abs(p["impact"]["delta_mii"]) >= 1.0]
    if high_impact:
        print(f"\n  High-impact proposals (|ΔMII| >= 1.0):")
        for p in high_impact[:5]:
            print(f"    - {p['action']} {p['provider']}/{p['model']}: ΔMII={p['impact']['delta_mii']:.1f}")