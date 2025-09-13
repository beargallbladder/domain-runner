print("🔥 REAL CRAWL COST - TENSOR OVER TIME ANALYSIS")
print("=" * 60)
print()

# YOUR ACTUAL HISTORICAL PATTERN from database
print("YOUR ACTUAL PROVIDER MIX (from last crawl):")
print("-" * 60)

providers = [
    # BASE LLMs (12 original)
    {"name": "OpenAI GPT-4o-mini", "responses": 40186, "input_cost": 0.00015, "output_cost": 0.0006},
    {"name": "DeepSeek", "responses": 39794, "input_cost": 0.00014, "output_cost": 0.00028},
    {"name": "Mistral", "responses": 31906, "input_cost": 0.001, "output_cost": 0.003},
    {"name": "Cohere", "responses": 16771, "input_cost": 0.0015, "output_cost": 0.002},
    {"name": "Together", "responses": 15345, "input_cost": 0.0002, "output_cost": 0.0002},
    {"name": "Anthropic Claude", "responses": 9436, "input_cost": 0.00025, "output_cost": 0.00125},
    {"name": "Groq", "responses": 9247, "input_cost": 0.00009, "output_cost": 0.00009},
    {"name": "XAI Grok-2", "responses": 3709, "input_cost": 0.005, "output_cost": 0.01},
    {"name": "Google Gemini", "responses": 3083, "input_cost": 0.000075, "output_cost": 0.0003},
    {"name": "AI21 Jamba", "responses": 3214, "input_cost": 0.002, "output_cost": 0.008},
    {"name": "OpenRouter Hermes", "responses": 3249, "input_cost": 0.0008, "output_cost": 0.0008},
    {"name": "Meta Llama (via Together)", "responses": 4821, "input_cost": 0.0002, "output_cost": 0.0002},
    
    # SEARCH-ENHANCED (4 new additions)
    {"name": "Perplexity Sonar Small", "responses": 3041, "input_cost": 0.0002, "output_cost": 0.0002},
    {"name": "Perplexity Sonar Pro", "responses": 1143, "input_cost": 0.001, "output_cost": 0.001},
    {"name": "Perplexity Sonar Large", "responses": 324, "input_cost": 0.003, "output_cost": 0.003},
    {"name": "SearchGPT (You.com)", "responses": 0, "input_cost": 0.0015, "output_cost": 0.0015},  # To be added
]

DOMAINS = 3249
PROMPTS_PER_DOMAIN = 3  # Multiple prompts as you mentioned\!
AVG_INPUT_TOKENS = 200  # Per prompt
AVG_OUTPUT_TOKENS = 300  # Per response

print("\n🎯 YOUR CRAWL PATTERN:")
print(f"  • Domains: {DOMAINS:,}")
print(f"  • Prompts per domain: {PROMPTS_PER_DOMAIN}")
print(f"  • Total queries: {DOMAINS * PROMPTS_PER_DOMAIN * 16:,} (16 providers)")
print(f"  • Purpose: TENSOR OVER TIME - Consensus & Memory Volatility")
print()

print("COST BREAKDOWN BY PROVIDER:")
print("-" * 60)

total_cost = 0
provider_costs = []

for p in providers:
    # Calculate for multiple prompts
    total_input_tokens = DOMAINS * PROMPTS_PER_DOMAIN * AVG_INPUT_TOKENS
    total_output_tokens = DOMAINS * PROMPTS_PER_DOMAIN * AVG_OUTPUT_TOKENS
    
    input_cost = (total_input_tokens / 1000) * p['input_cost']
    output_cost = (total_output_tokens / 1000) * p['output_cost']
    provider_total = input_cost + output_cost
    
    total_cost += provider_total
    provider_costs.append((p['name'], provider_total))
    
    if provider_total > 0.01:  # Only show significant costs
        print(f"{p['name']:<25} ${provider_total:>8.2f}")

print()
print("=" * 60)
print("TOTAL COSTS:")
print("-" * 60)

# Sort by cost
provider_costs.sort(key=lambda x: x[1], reverse=True)

print("\nMost Expensive Providers:")
for name, cost in provider_costs[:5]:
    print(f"  {name:<25} ${cost:>8.2f}")

print("\nCheapest Providers:")
for name, cost in provider_costs[-5:]:
    print(f"  {name:<25} ${cost:>8.2f}")

print()
print("=" * 60)
print("🔥 FULL TENSOR CRAWL COST:")
print("-" * 60)
print(f"Base cost (16 providers × 3,249 domains × 3 prompts): ${total_cost:.2f}")
print(f"Error retries (10% for complex multi-prompt): ${total_cost * 0.10:.2f}")
print(f"Render compute (3-4 hours runtime): $0.50")
print()
print(f"💰 TOTAL COST: ${total_cost * 1.10 + 0.50:.2f}")
print()

print("📊 WHAT YOU GET FOR THIS:")
print("  • Information asymmetry across 16 providers")
print("  • Tribal clustering (12 base vs 4 search)")
print("  • Memory decay patterns over time")
print("  • Consensus volatility metrics")
print("  • 155,952 total API calls")
print("  • Rich tensor data for time series analysis")
print()

print("💡 COST EFFICIENCY:")
print(f"  • Per domain (all providers): ${(total_cost * 1.10 + 0.50) / DOMAINS:.3f}")
print(f"  • Per API call: ${(total_cost * 1.10 + 0.50) / (DOMAINS * 16 * 3):.5f}")
print(f"  • Per data point: ${(total_cost * 1.10 + 0.50) / (DOMAINS * 16 * 3):.5f}")
