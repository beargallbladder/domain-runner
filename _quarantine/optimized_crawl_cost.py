print("📊 OPTIMIZED CRAWL COST ANALYSIS")
print("=" * 60)
print()

DOMAINS = 3249

# Realistic provider selection
providers = {
    "ESSENTIAL (Must Have)": [
        {"name": "OpenAI GPT-4o-mini", "cost_per_domain": 0.000173},
        {"name": "Anthropic Claude Haiku", "cost_per_domain": 0.00035},
        {"name": "Google Gemini Flash", "cost_per_domain": 0.000086},
        {"name": "Perplexity Sonar Small", "cost_per_domain": 0.00008},
    ],
    "VALUABLE (Good to Have)": [
        {"name": "DeepSeek Chat", "cost_per_domain": 0.000091},
        {"name": "Groq Llama", "cost_per_domain": 0.000036},
        {"name": "Together Llama", "cost_per_domain": 0.00008},
    ],
    "EXPENSIVE (Optional)": [
        {"name": "XAI Grok-2", "cost_per_domain": 0.00325},
        {"name": "Mistral Small", "cost_per_domain": 0.0009},
        {"name": "Cohere Command", "cost_per_domain": 0.000725},
    ]
}

print("OPTION 1: BUDGET CRAWL (4 Essential Providers)")
print("-" * 60)
budget_cost = 0
for p in providers["ESSENTIAL"]:
    cost = p["cost_per_domain"] * DOMAINS
    budget_cost += cost
    print(f"  {p['name']:<25} ${cost:>7.2f}")
print(f"\n  TOTAL: ${budget_cost:.2f} for {DOMAINS:,} domains")
print(f"  Time: ~30 minutes")
print()

print("OPTION 2: STANDARD CRAWL (7 Providers)")
print("-" * 60)
standard_cost = budget_cost
for p in providers["VALUABLE"]:
    cost = p["cost_per_domain"] * DOMAINS
    standard_cost += cost
    print(f"  {p['name']:<25} ${cost:>7.2f}")
print(f"\n  Plus essential providers: ${budget_cost:.2f}")
print(f"  TOTAL: ${standard_cost:.2f} for {DOMAINS:,} domains")
print(f"  Time: ~1 hour")
print()

print("OPTION 3: COMPREHENSIVE CRAWL (10 Providers)")
print("-" * 60)
comprehensive_cost = standard_cost
for p in providers["EXPENSIVE"]:
    cost = p["cost_per_domain"] * DOMAINS
    comprehensive_cost += cost
    print(f"  {p['name']:<25} ${cost:>7.2f}")
print(f"\n  Plus standard providers: ${standard_cost:.2f}")
print(f"  TOTAL: ${comprehensive_cost:.2f} for {DOMAINS:,} domains")
print(f"  Time: ~2 hours")
print()

print("=" * 60)
print("💰 RECOMMENDED: STANDARD CRAWL")
print("-" * 60)
print(f"  Cost: ${standard_cost:.2f}")
print(f"  Providers: 7 (good tribal mix)")
print(f"  Coverage: Base LLMs + Search Enhanced")
print(f"  Information Asymmetry: Visible")
print(f"  Runtime: ~1 hour")
print()

print("🔥 COST BREAKDOWN:")
print(f"  • API costs: ${standard_cost:.2f}")
print(f"  • Render compute: ~$0.25")
print(f"  • Error retries (5%): ${standard_cost * 0.05:.2f}")
print(f"  • TOTAL: ${standard_cost * 1.05 + 0.25:.2f}")
print()

print("📈 SCALING COSTS:")
print(f"  • 100 domains: ${(standard_cost / DOMAINS * 100 * 1.05):.2f}")
print(f"  • 500 domains: ${(standard_cost / DOMAINS * 500 * 1.05):.2f}")
print(f"  • 1,000 domains: ${(standard_cost / DOMAINS * 1000 * 1.05):.2f}")
print(f"  • 5,000 domains: ${(standard_cost / DOMAINS * 5000 * 1.05):.2f}")
print(f"  • 10,000 domains: ${(standard_cost / DOMAINS * 10000 * 1.05):.2f}")
