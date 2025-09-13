import json

# Current provider distribution from database
providers = [
    {"name": "openai", "count": 40186, "model": "gpt-4o-mini", "price_per_1k_input": 0.00015, "price_per_1k_output": 0.0006},
    {"name": "deepseek", "count": 39794, "model": "deepseek-chat", "price_per_1k_input": 0.00014, "price_per_1k_output": 0.00028},
    {"name": "mistral", "count": 31906, "model": "mistral-small", "price_per_1k_input": 0.001, "price_per_1k_output": 0.003},
    {"name": "cohere", "count": 16771, "model": "command", "price_per_1k_input": 0.0015, "price_per_1k_output": 0.002},
    {"name": "together", "count": 15345, "model": "llama-3-8b", "price_per_1k_input": 0.0002, "price_per_1k_output": 0.0002},
    {"name": "anthropic", "count": 9436, "model": "claude-3-haiku", "price_per_1k_input": 0.00025, "price_per_1k_output": 0.00125},
    {"name": "groq", "count": 9247, "model": "llama-3.2-90b", "price_per_1k_input": 0.00009, "price_per_1k_output": 0.00009},
    {"name": "openai/gpt-4o-mini", "count": 13482, "model": "gpt-4o-mini", "price_per_1k_input": 0.00015, "price_per_1k_output": 0.0006},
    {"name": "xai/grok-2", "count": 3709, "model": "grok-2", "price_per_1k_input": 0.005, "price_per_1k_output": 0.01},
    {"name": "google/gemini-1.5-flash", "count": 3083, "model": "gemini-flash", "price_per_1k_input": 0.000075, "price_per_1k_output": 0.0003},
    {"name": "perplexity/sonar-small", "count": 3041, "model": "sonar-small", "price_per_1k_input": 0.0002, "price_per_1k_output": 0.0002},
    {"name": "ai21/jamba-1.5", "count": 3214, "model": "jamba", "price_per_1k_input": 0.002, "price_per_1k_output": 0.008},
    {"name": "openrouter/hermes", "count": 3249, "model": "hermes-70b", "price_per_1k_input": 0.0008, "price_per_1k_output": 0.0008},
    {"name": "perplexity/sonar-pro", "count": 1143, "model": "sonar-pro", "price_per_1k_input": 0.001, "price_per_1k_output": 0.001},
    {"name": "google/gemini-pro", "count": 114, "model": "gemini-pro", "price_per_1k_input": 0.00035, "price_per_1k_output": 0.00105}
]

# Analysis parameters
DOMAINS = 3249
AVG_INPUT_TOKENS = 150  # "Tell me about domain.com"
AVG_OUTPUT_TOKENS = 250  # Response about the domain

print("🧮 EXACT CRAWL COST CALCULATION")
print("=" * 60)
print(f"Domains to crawl: {DOMAINS:,}")
print(f"Avg input tokens per request: {AVG_INPUT_TOKENS}")
print(f"Avg output tokens per response: {AVG_OUTPUT_TOKENS}")
print()

# Calculate costs for each provider
total_cost = 0
provider_costs = []

print("COST PER PROVIDER:")
print("-" * 60)

for p in providers[:15]:  # Top 15 providers
    # Each domain gets queried once per provider
    input_tokens = DOMAINS * AVG_INPUT_TOKENS
    output_tokens = DOMAINS * AVG_OUTPUT_TOKENS
    
    input_cost = (input_tokens / 1000) * p['price_per_1k_input']
    output_cost = (output_tokens / 1000) * p['price_per_1k_output']
    provider_total = input_cost + output_cost
    
    provider_costs.append({
        'name': p['name'],
        'model': p['model'],
        'cost': provider_total
    })
    
    total_cost += provider_total
    
    print(f"{p['name']:<25} ${provider_total:>8.4f}  ({p['model']})")
    print(f"  Input:  {input_tokens:,} tokens × ${p['price_per_1k_input']}/1K = ${input_cost:.4f}")
    print(f"  Output: {output_tokens:,} tokens × ${p['price_per_1k_output']}/1K = ${output_cost:.4f}")
    print()

print("=" * 60)
print("SUMMARY:")
print("-" * 60)

# Breakdown by cost
print("\nTop 5 Most Expensive Providers:")
sorted_costs = sorted(provider_costs, key=lambda x: x['cost'], reverse=True)
for i, p in enumerate(sorted_costs[:5], 1):
    print(f"  {i}. {p['name']:<20} ${p['cost']:.4f}")

print("\nTop 5 Cheapest Providers:")
for i, p in enumerate(sorted_costs[-5:], 1):
    print(f"  {i}. {p['name']:<20} ${p['cost']:.4f}")

# Calculate with different scenarios
print("\n" + "=" * 60)
print("TOTAL COST SCENARIOS:")
print("-" * 60)

# Scenario 1: All 15 providers
scenario1 = total_cost
print(f"1. All 15 major providers:     ${scenario1:.2f}")

# Scenario 2: Only cheap providers (Groq, Gemini, Together)
cheap_providers = ['groq', 'google/gemini-1.5-flash', 'together']
cheap_cost = sum(p['cost'] for p in provider_costs if any(cp in p['name'] for cp in cheap_providers))
print(f"2. Only cheap providers (3):   ${cheap_cost:.2f}")

# Scenario 3: Balanced mix (5 premium, 5 mid, 5 cheap)
balanced_cost = sum(p['cost'] for p in sorted_costs[:5]) + \
                sum(p['cost'] for p in sorted_costs[5:10]) + \
                sum(p['cost'] for p in sorted_costs[-5:])
print(f"3. Balanced mix (15 providers): ${balanced_cost:.2f}")

# Additional costs
print("\n" + "=" * 60)
print("ADDITIONAL CONSIDERATIONS:")
print("-" * 60)
print(f"• Rate limiting delays: ~2-3 hours runtime")
print(f"• Render compute cost: ~$0.10-0.50 (background worker)")
print(f"• Database storage: Negligible (few MB)")
print(f"• Error retries (5% failure): +${scenario1 * 0.05:.2f}")

print("\n" + "=" * 60)
print(f"🎯 FINAL ESTIMATED COST: ${scenario1 * 1.05:.2f}")
print(f"   (includes 5% retry overhead)")
print("=" * 60)

# Cost per domain
print(f"\n💡 Cost per domain: ${(scenario1 * 1.05) / DOMAINS:.4f}")
print(f"💡 Cost per 1000 domains: ${(scenario1 * 1.05) / DOMAINS * 1000:.2f}")
