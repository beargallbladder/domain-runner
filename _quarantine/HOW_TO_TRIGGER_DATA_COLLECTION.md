# 🚀 HOW TO TRIGGER DATA COLLECTION RUNS

## **🎯 CRITICAL: READ THIS FIRST**

The sophisticated-runner automatically processes domains with `status = 'pending'`. To trigger data collection, you add domains to the database with pending status.

## **📋 VERIFIED WORKING METHOD**

### **Step 1: Use the Trigger Script**
```bash
# Trigger both weekly and premium runs
node trigger_weekly_premium_runs.js

# Or trigger individually:
node trigger_weekly_premium_runs.js weekly
node trigger_weekly_premium_runs.js premium
```

### **Step 2: Monitor Progress**
- **Health Check**: https://sophisticated-runner.onrender.com/health
- **Data Stats**: https://llm-pagerank-public-api.onrender.com/health
- **Processing**: Automatically starts within minutes

## **🔧 HOW IT WORKS**

1. **Script adds domains** with `status = 'pending'` to database
2. **Sophisticated-runner's processNextBatch()** automatically detects pending domains
3. **Real LLM API calls** are made using 15 models:
   - Claude Haiku, DeepSeek Chat, GPT-4o-mini, Mistral Small, etc.
4. **Database is populated** with fresh responses
5. **Cache system regenerates** with updated scores

## **📊 WHAT GETS PROCESSED**

### **Weekly Budget Run (25 domains)**
- OpenAI, Anthropic, Google, Microsoft, Apple, Tesla, NVIDIA, Meta, Amazon, Netflix
- Stripe, Shopify, Salesforce, Adobe, GitHub, Figma, Canva, Spotify
- Coinbase, PayPal, NYTimes, WSJ, CNN, Bloomberg, Reuters

### **Premium Run (14 domains)**  
- DeepMind, Mistral, Cohere, X.AI, Databricks, Snowflake
- AWS, Azure, Google Cloud, Binance, Kraken, Gemini
- QuickBooks, Xero

## **⚡ PROCESSING DETAILS**

- **Models Used**: 15 AI models per domain
- **Prompts**: 3 types (business_analysis, content_strategy, technical_assessment)
- **Total API Calls**: ~1,755 calls (39 domains × 15 models × 3 prompts)
- **Duration**: 2-4 hours for completion
- **Cost**: Budget-optimized with cheapest models

## **🚨 TROUBLESHOOTING**

### **If Nothing Happens:**
1. Check sophisticated-runner health
2. Verify domains were added to database
3. Check Render service logs
4. Ensure API keys are configured

### **If Processing Stops:**
1. Re-run the trigger script
2. Check for API key issues
3. Monitor sophisticated-runner service

## **📝 LAST VERIFIED**
- **Date**: June 27, 2025
- **Status**: ✅ WORKING
- **Domains Processed**: 39 domains successfully triggered
- **Service**: sophisticated-runner.onrender.com

**🎯 THIS IS THE DEFINITIVE METHOD - NO MORE GUESSING!** 