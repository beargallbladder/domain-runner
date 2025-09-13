#!/usr/bin/env python3
"""
Provider validation tool - checks which LLM providers are configured and available.
Usage: python tools/validate_providers.py
"""

import os
import sys

# Add the agents directory to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
llm_runner_path = os.path.join(project_root, "agents", "llm-query-runner", "src")
sys.path.insert(0, llm_runner_path)

from providers.registry import load_runtime, build_clients

if __name__ == "__main__":
    print("=" * 60)
    print("LLM Provider Validation")
    print("=" * 60)

    # Load runtime config
    try:
        runtime = load_runtime()
        print(f"✓ Loaded runtime config (mode: {runtime.get('mode', 'unknown')})")
        print(f"  Budget: ${runtime.get('llm_budget', {}).get('hourly_usd_cap', 0)}/hour")
    except Exception as e:
        print(f"✗ Failed to load runtime config: {e}")
        sys.exit(1)

    # Check configured providers
    providers = runtime.get("providers", {})
    print(f"\nConfigured providers: {len(providers)}")
    for name, cfg in providers.items():
        status = "✓ enabled" if cfg.get("enabled") else "  disabled"
        model = cfg.get("model", "?")
        print(f"  {status} {name:12} → {model}")

    # Build active clients
    print("\nBuilding active clients...")
    clients = build_clients(runtime)

    if clients:
        active = ", ".join(sorted(clients.keys()))
        print(f"✓ Active provider models: {active}")

        # Optional: smoke test with a simple prompt
        print("\nSmoke test (optional - uncomment to run):")
        print("# for model, client in clients.items():")
        print("#     try:")
        print('#         resp = client.call("Say OK", timeout=5)')
        print('#         print(f"  ✓ {model}: {resp[:50]}")')
        print("#     except Exception as e:")
        print('#         print(f"  ✗ {model}: {e}")')
    else:
        print("✗ No active providers (check API keys in environment)")
        print("\nRequired environment variables:")
        for name, cfg in providers.items():
            if cfg.get("enabled"):
                env_var = cfg.get("api_key_env")
                has_key = "✓" if os.environ.get(env_var) else "✗"
                print(f"  {has_key} {env_var}")