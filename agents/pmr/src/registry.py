"""
Provider & Model Registry - Discovery and Diff
Maintains authoritative registry of available models and their status.
"""

import json
import datetime
import os
import yaml
from typing import Dict, List, Optional
try:
    from .sources import (
        openai_catalog, anthropic_catalog, deepseek_catalog,
        mistral_catalog, perplexity_catalog, cohere_catalog,
        ai21_catalog, google_catalog, groq_catalog,
        together_catalog, xai_catalog
    )
except ImportError:
    # For direct execution
    from sources import (
        openai_catalog, anthropic_catalog, deepseek_catalog,
        mistral_catalog, perplexity_catalog, cohere_catalog,
        ai21_catalog, google_catalog, groq_catalog,
        together_catalog, xai_catalog
    )

PROVIDER_CATALOGS = {
    "openai": openai_catalog,
    "anthropic": anthropic_catalog,
    "deepseek": deepseek_catalog,
    "mistral": mistral_catalog,
    "perplexity": perplexity_catalog,
    "cohere": cohere_catalog,
    "ai21": ai21_catalog,
    "google": google_catalog,
    "groq": groq_catalog,
    "together": together_catalog,
    "xai": xai_catalog
}

def discover() -> List[Dict]:
    """
    Discover all available models from provider catalogs.
    Returns list of registry entries with status and parameters.
    """
    rows = []
    now = datetime.datetime.utcnow().isoformat() + "Z"

    for provider_name, catalog_fn in PROVIDER_CATALOGS.items():
        try:
            models = catalog_fn()
            for model in models:
                registry_entry = {
                    "provider": provider_name,
                    "model": model["name"],
                    "status": model.get("status", "unknown"),
                    "last_checked_iso": now,
                    "endpoint": model.get("endpoint", ""),
                    "params": model.get("defaults", {}),
                    "capabilities": model.get("capabilities", {})
                }
                if "notes" in model:
                    registry_entry["notes"] = model["notes"]
                rows.append(registry_entry)
        except Exception as e:
            print(f"[PMR] Failed to get catalog for {provider_name}: {e}")

    return rows

def diff_with_runtime(registry: List[Dict], runtime_path: str = "config/runtime.yml") -> Dict:
    """
    Compare registry with runtime.yml to detect discrepancies.
    Returns dict with new, changed, missing, and deprecated models.
    """
    # Load runtime config
    if not os.path.exists(runtime_path):
        # Try from project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        runtime_path = os.path.join(project_root, runtime_path)

    with open(runtime_path) as f:
        runtime = yaml.safe_load(f)

    # Build sets for comparison
    registry_models = {(r["provider"], r["model"]): r for r in registry}
    runtime_models = {}

    for provider, config in runtime.get("providers", {}).items():
        if config.get("enabled"):
            model = config.get("model")
            if model:
                runtime_models[(provider, model)] = config

    # Detect differences
    diff_result = {
        "new": [],        # In registry but not in runtime
        "deprecated": [], # In runtime but marked deprecated/eol in registry
        "missing": [],    # In runtime but not in registry
        "changed": []     # Parameters differ
    }

    # Find new models (in registry, not in runtime)
    for (provider, model), reg_entry in registry_models.items():
        if (provider, model) not in runtime_models:
            if reg_entry["status"] == "active":
                diff_result["new"].append(reg_entry)

    # Find deprecated/missing models (in runtime)
    for (provider, model), runtime_entry in runtime_models.items():
        if (provider, model) in registry_models:
            reg_entry = registry_models[(provider, model)]
            if reg_entry["status"] in ["deprecated", "eol"]:
                diff_result["deprecated"].append({
                    **reg_entry,
                    "runtime_config": runtime_entry
                })
        else:
            # Model in runtime but not in registry
            diff_result["missing"].append({
                "provider": provider,
                "model": model,
                "runtime_config": runtime_entry
            })

    return diff_result

def save_registry(registry: List[Dict], output_path: str = "artifacts/provider_registry.json"):
    """Save registry to JSON file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(registry, f, indent=2)
    print(f"[PMR] Registry saved to {output_path} ({len(registry)} models)")

def load_registry(input_path: str = "artifacts/provider_registry.json") -> List[Dict]:
    """Load registry from JSON file."""
    with open(input_path) as f:
        return json.load(f)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PMR Registry Discovery")
    parser.add_argument("--out", default="artifacts/provider_registry.json", help="Output path")
    parser.add_argument("--diff", action="store_true", help="Show diff with runtime.yml")
    args = parser.parse_args()

    # Discover all models
    registry = discover()
    save_registry(registry, args.out)

    # Show summary
    by_status = {}
    for r in registry:
        status = r["status"]
        by_status[status] = by_status.get(status, 0) + 1

    print(f"\n[PMR] Registry Summary:")
    for status, count in sorted(by_status.items()):
        print(f"  {status}: {count} models")

    # Show diff if requested
    if args.diff:
        diff = diff_with_runtime(registry)
        print(f"\n[PMR] Diff with runtime.yml:")
        print(f"  New models: {len(diff['new'])}")
        print(f"  Deprecated: {len(diff['deprecated'])}")
        print(f"  Missing: {len(diff['missing'])}")

        if diff['deprecated']:
            print("\n  ⚠️  Deprecated models still in runtime:")
            for d in diff['deprecated']:
                print(f"    - {d['provider']}/{d['model']} (status: {d['status']})")