print("📋 COMPLETE LIST OF ALL 35 PROVIDERS IN YOUR DATABASE")
print("=" * 60)
print()

# From the actual database query results
providers = [
    # HIGHEST VOLUME (10,000+ responses)
    ("openai", 40186, "base-llm"),
    ("deepseek", 39794, "base-llm"),
    ("mistral", 31906, "base-llm"),
    ("cohere", 16771, "base-llm"),
    ("together", 15345, "base-llm"),
    ("openai/gpt-4o-mini", 13482, "base-llm"),
    
    # MEDIUM VOLUME (1,000-10,000 responses)
    ("anthropic", 9436, "base-llm"),
    ("groq", 9247, "base-llm"),
    ("deepseek/deepseek-chat", 5389, "base-llm"),
    ("mistral/mistral-small-latest", 4862, "base-llm"),
    ("together/meta-llama/Llama-3-8b-chat-hf", 4821, "base-llm"),
    ("gpt-4o-mini", 3960, "base-llm"),
    ("xai/grok-2", 3709, "base-llm"),
    ("claude-3-haiku-20240307", 3477, "base-llm"),
    ("google", 3407, "base-llm"),
    ("openrouter/hermes-3-llama-3.1-70b", 3249, "base-llm"),
    ("ai21/jamba-1.5-large", 3214, "base-llm"),
    ("gemini-1.5-flash", 3083, "base-llm"),
    ("perplexity/llama-3.1-sonar-small-128k-online", 3041, "search-enhanced"),
    ("anthropic/claude-3-haiku-20240307", 1799, "base-llm"),
    ("google/gemini-1.5-flash", 1574, "base-llm"),
    ("openai/gpt-3.5-turbo", 1195, "base-llm"),
    ("perplexity/sonar-pro", 1143, "search-enhanced"),
    ("groq/llama-3.2-90b-text-preview", 1060, "base-llm"),
    
    # LOWER VOLUME (<1,000 responses)
    ("gpt-3.5-turbo", 798, "base-llm"),
    ("cohere/command-r-plus", 722, "base-llm"),
    ("groq/llama3-8b-8192", 605, "base-llm"),
    ("perplexity/sonar", 605, "search-enhanced"),
    ("ai21/jamba-mini", 595, "base-llm"),
    ("perplexity/llama-3.1-sonar-large-128k-online", 324, "search-enhanced"),
    ("xai/grok-beta", 300, "base-llm"),
    ("google/gemini-1.5-pro", 114, "base-llm"),
    ("deepseek-chat", 41, "base-llm"),
    ("meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", 2, "base-llm"),
    ("mistral-small-latest", 2, "base-llm")
]

print("🤖 BASE LLM PROVIDERS (31 total):")
print("-" * 40)
base_llms = [p for p in providers if p[2] == "base-llm"]
for i, (name, count, _) in enumerate(base_llms, 1):
    print(f"{i:2}. {name:<45} ({count:,} responses)")

print()
print("🔍 SEARCH-ENHANCED PROVIDERS (4 total):")
print("-" * 40)
search_llms = [p for p in providers if p[2] == "search-enhanced"]
for i, (name, count, _) in enumerate(search_llms, 1):
    print(f"{i:2}. {name:<45} ({count:,} responses)")

print()
print("=" * 60)
print("📊 SUMMARY FOR DIRECTIVES:")
print()
print("TOTAL: 35 unique providers")
print("  • 31 Base LLMs (traditional training-based)")
print("  • 4 Search-Enhanced (real-time web access)")
print()
print("KEY PROVIDERS TO MAINTAIN:")
print("  1. OpenAI variants (GPT-4o-mini, GPT-3.5)")
print("  2. Anthropic Claude variants")
print("  3. Google Gemini variants")
print("  4. DeepSeek variants")
print("  5. Mistral variants")
print("  6. Groq (multiple Llama models)")
print("  7. XAI Grok variants")
print("  8. Cohere variants")
print("  9. Together AI (Meta Llama)")
print(" 10. AI21 Jamba variants")
print(" 11. OpenRouter Hermes")
print(" 12. Perplexity (ALL 4 search variants)")
