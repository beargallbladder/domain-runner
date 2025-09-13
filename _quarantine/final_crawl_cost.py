print("💰 EXACT CRAWL COST FOR 3,249 DOMAINS")
print("=" * 60)
print()

DOMAINS = 3249

# Three crawl options
print("OPTION 1: MINIMAL CRAWL (Save Money)")
print("-" * 40)
minimal = [
    ("Groq Llama", 0.000036),
    ("Google Gemini Flash", 0.000086),
    ("DeepSeek", 0.000091),
    ("Together AI", 0.00008)
]
minimal_cost = sum(cost * DOMAINS for _, cost in minimal)
print(f"  4 cheapest providers")
print(f"  COST: ${minimal_cost:.2f}")
print(f"  Time: ~30 minutes")
print()

print("OPTION 2: STANDARD CRAWL (Recommended)")
print("-" * 40)
standard = [
    ("OpenAI GPT-4o-mini", 0.000173),
    ("Claude Haiku", 0.00035),
    ("Gemini Flash", 0.000086),
    ("Perplexity Sonar", 0.00008),
    ("DeepSeek", 0.000091),
    ("Groq", 0.000036),
    ("Together", 0.00008)
]
standard_cost = sum(cost * DOMAINS for _, cost in standard)
print(f"  7 diverse providers (base + search)")
print(f"  COST: ${standard_cost:.2f}")
print(f"  Time: ~1 hour")
print()

print("OPTION 3: PREMIUM CRAWL (Maximum Insights)")
print("-" * 40)
# Add expensive ones
premium_extra = standard_cost + (0.00325 * DOMAINS)  # Add Grok-2
premium_extra += (0.0009 * DOMAINS)  # Add Mistral
premium_extra += (0.000725 * DOMAINS)  # Add Cohere
print(f"  10 providers including premium")
print(f"  COST: ${premium_extra:.2f}")
print(f"  Time: ~2 hours")
print()

print("=" * 60)
print("🎯 FINAL ANSWER:")
print()
print(f"To crawl all 3,249 domains:")
print(f"  • Minimum viable: ${minimal_cost:.2f}")
print(f"  • Recommended: ${standard_cost + (standard_cost * 0.05) + 0.25:.2f}")
print(f"    (includes 5% retries + compute)")
print(f"  • Premium: ${premium_extra + (premium_extra * 0.05) + 0.25:.2f}")
