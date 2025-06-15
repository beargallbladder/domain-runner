# 🚀 Brand Intelligence Scheduler - Real API Integration

## ✨ What Changed

✅ **REAL API CALLS** - No more mock responses!  
✅ **Multi-Provider Support** - OpenAI, Anthropic, Google, Mistral, Perplexity, xAI, Together AI  
✅ **Smart Rate Limiting** - Provider-specific delays  
✅ **Accurate Cost Tracking** - Real usage & pricing  
✅ **Error Handling** - Graceful API failures  

## 🔧 Quick Setup

### 1. Install Dependencies & Verify APIs
```bash
python3 setup_scheduler.py
```
This will:
- Install required packages (openai, anthropic, google-generativeai)
- Check your API keys
- Optionally test connectivity with 1 domain (~$0.01)

### 2. Set API Keys (Environment Variables)
```bash
# Add to your ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="sk-your-key-here"
export ANTHROPIC_API_KEY="sk-ant-your-key-here"  
export GOOGLE_API_KEY="your-google-key-here"
export MISTRAL_API_KEY="your-mistral-key-here"
export PERPLEXITY_API_KEY="your-perplexity-key-here"
export XAI_API_KEY="your-xai-key-here"
export TOGETHER_API_KEY="your-together-key-here"

# Reload shell
source ~/.zshrc
```

### 3. Test with Real APIs
```bash
# Small test (7 models × 3 prompts × 5 domains = 105 calls ~$0.08)
python3 weekly_domain_scheduler.py test 5

# Check status
python3 weekly_domain_scheduler.py status
```

## 💰 Cost Estimates (Real Pricing)

### Weekly Budget Runs (Sundays)
- **Models**: Claude Haiku, GPT-4o Mini, Gemini Flash, Mistral Small, Perplexity Small, Grok Beta, Llama-2-7B
- **Cost per domain**: ~$0.004 (3 prompts × 7 models)
- **1,705 domains**: ~$6.82 per weekly run
- **Monthly cost**: ~$27.28

### Bi-weekly Premium Runs (Wednesdays)  
- **Models**: GPT-4o, Claude Sonnet, GPT-4 Turbo
- **Cost per domain**: ~$0.027 (3 prompts × 3 models)
- **1,705 domains**: ~$46.04 per premium run
- **Monthly cost**: ~$100.00

### **Total Monthly Cost: ~$127** 🎯

## 🤖 Supported Models & Pricing

| Provider | Model | Input (per 1K) | Output (per 1K) | Speed |
|----------|-------|----------------|-----------------|-------|
| **OpenAI** | gpt-4o-mini | $0.00015 | $0.0006 | ⚡️ Fast |
| **OpenAI** | gpt-4o | $0.005 | $0.015 | 🔥 Premium |
| **Anthropic** | claude-3-haiku | $0.00025 | $0.00125 | ⚡️ Cheap |
| **Anthropic** | claude-3.5-sonnet | $0.003 | $0.015 | 🔥 Best |
| **Google** | gemini-1.5-flash | ~$0.0005 | ~$0.0005 | ⚡️ Fast |
| **Mistral** | mistral-small-2402 | $0.0002 | $0.0006 | ⚡️ Cheap |
| **Perplexity** | sonar-small-128k | $0.0002 | $0.0002 | ⚡️ Super Cheap |
| **xAI** | grok-beta | $0.005 | $0.015 | 🚀 Fast |
| **Together AI** | llama-2-7b-chat | $0.0002 | $0.0002 | ⚡️ Ultra Cheap |

## 🚨 IMPORTANT - This Makes Real API Calls!

- **No more mock responses** - Every call costs real money
- **Rate limited** - Respects provider limits (6-20s between calls)
- **Error handling** - Skips models with missing API keys
- **Cost tracking** - Real usage reporting in logs

## 🧪 Test Before Production

```bash
# Test 1 domain (21 calls ~$0.02)
python3 weekly_domain_scheduler.py test 1

# Test 10 domains (210 calls ~$0.15)  
python3 weekly_domain_scheduler.py test 10

# Check results in logs
tail -f brand_intelligence.log
```

## 🔄 Production Usage

```bash
# Manual weekly run (~$7)
python3 weekly_domain_scheduler.py weekly

# Manual premium run (~$46)
python3 weekly_domain_scheduler.py premium

# Start automated scheduler
python3 weekly_domain_scheduler.py
```

## 🔑 API Key Management

The scheduler gracefully handles missing API keys:
- **Available providers**: Used normally
- **Missing providers**: Models skipped with warning
- **No providers**: Exits with helpful error message

## 📊 Monitoring & Logs

All activity logged to `brand_intelligence.log`:
- API call attempts & successes
- Rate limiting delays
- Cost tracking per call
- Error details & recovery

---

**🎉 You now have REAL LLM intelligence with Wall Street-grade data collection!** 