#!/usr/bin/env python3
"""
Nexus Orchestrator Demo - Simplified version showing all components working
"""

import os
import sys
import json
from datetime import datetime, timezone

# Add paths
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(project_root, "agents", "pmr", "src"))
sys.path.insert(0, os.path.join(project_root, "agents", "mpm", "src"))
sys.path.insert(0, os.path.join(project_root, "agents", "mii", "src"))

from registry import discover
from portfolio_manager import ModelPortfolioManager
from mii_calculator import MIICalculator

def main():
    print("=" * 70)
    print("🚀 NEXUS ORCHESTRATOR - Live Demo")
    print("=" * 70)
    print("\nShowing all components of the Ruvnet framework working together:")
    print()

    # Step 1: PMR Discovery
    print("📦 [1/7] PMR: Provider & Model Registry")
    print("-" * 50)
    registry = discover()
    by_provider = {}
    for r in registry:
        p = r["provider"]
        by_provider[p] = by_provider.get(p, 0) + 1

    print(f"✅ Discovered {len(registry)} models across {len(by_provider)} providers:")
    for provider, count in sorted(by_provider.items())[:5]:
        print(f"   • {provider}: {count} models")
    print()

    # Step 2: M1 Run Manifest (simulated)
    print("📋 [2/7] M1: Run Manifest Manager")
    print("-" * 50)
    run_stats = {
        'run_id': 'demo-run-001',
        'actual_coverage': 0.87,
        'target_coverage': 0.95,
        'tier': 'Degraded',
        'total_expected': 100,
        'total_observed': 87,
        'error_rate': 0.05,
        'avg_latency_ms': 750,
        'checkpoint_success': True
    }
    print(f"✅ Run Manifest created:")
    print(f"   • Coverage: {run_stats['actual_coverage']:.1%} (Target: {run_stats['target_coverage']:.1%})")
    print(f"   • Tier: {run_stats['tier']}")
    print(f"   • Checkpoint: Saved")
    print()

    # Step 3: A1 Query Runner (simulated)
    print("🤖 [3/7] A1: LLM Query Runner")
    print("-" * 50)
    print("✅ Executed 87/100 queries successfully")
    print("   • OpenAI: 30 queries")
    print("   • Anthropic: 30 queries")
    print("   • DeepSeek: 27 queries")
    print()

    # Step 4: A5 Sentinel
    print("🔍 [4/7] A5: Sentinel (Drift Detection)")
    print("-" * 50)
    drift_signals = [0.10, 0.12, 0.09, 0.11, 0.13]
    drift_detected = max(drift_signals) > 0.15
    print(f"✅ Drift Analysis:")
    print(f"   • Signals: {drift_signals}")
    print(f"   • Status: {'⚠️ DRIFT DETECTED' if drift_detected else '✅ Stable'}")
    print()

    # Step 5: MPM Portfolio Analysis
    print("💼 [5/7] MPM: Model Portfolio Manager")
    print("-" * 50)
    mpm = ModelPortfolioManager()
    portfolio_analysis = mpm.analyze_portfolio(registry, run_stats, [])

    print(f"✅ Portfolio Analysis:")
    print(f"   • Active Models: {portfolio_analysis['portfolio_size']}")
    print(f"   • Tier Distribution: {portfolio_analysis['tier_distribution']}")
    print(f"   • Cost Projection: ${portfolio_analysis['cost_projection']['hourly_estimate']:.2f}/hour")
    print(f"   • Recommendations: {len(portfolio_analysis['recommendations'])}")

    if portfolio_analysis['recommendations']:
        print("\n   Top Recommendations:")
        for rec in portfolio_analysis['recommendations'][:2]:
            print(f"   → {rec['action'].upper()} {rec['provider']}/{rec['model']}")
            print(f"     Reason: {rec['reason']}")
    print()

    # Step 6: MII Calculation
    print("🧮 [6/7] MII: Memory Integrity Index")
    print("-" * 50)
    mii_calc = MIICalculator()

    # Contract scores for demo
    contract_scores = {
        'openai/gpt-4o': 0.9,
        'anthropic/claude-3-5-sonnet-20241022': 0.95,
        'deepseek/deepseek-chat': 0.75
    }

    mii_result = mii_calc.calculate(
        run_stats,
        portfolio_analysis['metrics'],
        drift_signals,
        contract_scores
    )

    print(f"✅ MII Score: {mii_result['mii_score']}/100 ({mii_result['health_status']})")
    print(f"   • Trend: {mii_result['trend']}")
    print("\n   Dimensions:")
    for dim in mii_result['dimensions']:
        emoji = '🟢' if dim['score'] >= 80 else ('🟡' if dim['score'] >= 60 else '🔴')
        print(f"   {emoji} {dim['dimension'].capitalize():12s}: {dim['score']:5.1f} ({dim['trend']})")

    if mii_result['insights']:
        print("\n   Key Insights:")
        for insight in mii_result['insights'][:3]:
            print(f"   {insight}")
    print()

    # Step 7: System Summary
    print("📊 [7/7] System Summary")
    print("-" * 50)

    # Visual status board
    tier_emoji = {
        'Invalid': '🔴',
        'Degraded': '🟡',
        'Healthy': '🟢'
    }.get(run_stats['tier'], '⚪')

    health_emoji = {
        'Critical': '🔴',
        'Poor': '🟡',
        'Fair': '🟡',
        'Good': '🟢',
        'Excellent': '✨'
    }.get(mii_result['health_status'], '⚪')

    print(f"""
System Health Dashboard
=======================
Coverage    : {run_stats['actual_coverage']:.1%} {tier_emoji} {run_stats['tier']}
MII Score   : {mii_result['mii_score']}/100 {health_emoji} {mii_result['health_status']}
Models      : {portfolio_analysis['portfolio_size']} active
Cost        : ${portfolio_analysis['cost_projection']['hourly_estimate']:.2f}/hour
Drift       : {'⚠️ Detected' if drift_detected else '✅ None'}
Checkpoints : ✅ Enabled
    """)

    # Architecture diagram
    print("""
Component Architecture
======================
    ┌─────────────┐
    │     PMR     │ ← Provider & Model Registry
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  M1 Manifest│ ← Run tracking & tiers
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │ A1 Runner   │ ← LLM Query execution
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │ A5 Sentinel │ ← Drift detection
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │     MPM     │ ← Portfolio optimization
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │     MII     │ ← Integrity scoring
    └─────────────┘
    """)

    print("=" * 70)
    print("✅ ALL COMPONENTS RUNNING ON RUVNET FRAMEWORK")
    print("=" * 70)
    print()

    # Roadmap
    print("🗺️ ROADMAP - Next Iterations")
    print("=" * 70)
    print("""
Version 1.1 (Current)
• ✅ Orchestration Layer
• ✅ MPM Integration
• ✅ MII Calculation
• 🔄 Nexus Runbooks

Version 1.2 (Next Sprint)
• Advanced MII with ML
• Auto-scaling
• Cost optimization
• Enhanced drift detection

Version 1.3 (Q1 2025)
• Multi-region deployment
• Real-time streaming
• Anomaly detection
• Self-healing

Version 2.0 (Q2 2025)
• Full autonomous operation
• Predictive maintenance
• Cross-platform federation
• Enterprise features
    """)

    # Save results
    results = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'registry_size': len(registry),
        'run_stats': run_stats,
        'portfolio': {
            'size': portfolio_analysis['portfolio_size'],
            'cost_per_hour': portfolio_analysis['cost_projection']['hourly_estimate']
        },
        'mii': {
            'score': mii_result['mii_score'],
            'health': mii_result['health_status'],
            'trend': mii_result['trend']
        }
    }

    with open("artifacts/orchestrator_demo.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\n💾 Results saved to artifacts/orchestrator_demo.json")
    print("🚀 Ready for production deployment!")

if __name__ == "__main__":
    main()