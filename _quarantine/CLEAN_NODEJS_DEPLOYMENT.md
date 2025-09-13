# Clean Node.js Deployment Guide

## Overview
This is a clean, working Node.js service that processes domains with 11 LLM providers. It's designed to deploy successfully on Render without any Rust compilation issues.

## Features
- ✅ Pure Node.js/TypeScript (no Rust compilation needed)
- ✅ 11 LLM providers configured
- ✅ Auto-processing every 30 seconds
- ✅ Health check endpoint
- ✅ Simple, maintainable code
- ✅ Deploys successfully on Render

## LLM Providers Supported
1. **OpenAI** - GPT-4o-mini
2. **Anthropic** - Claude 3 Haiku
3. **DeepSeek** - DeepSeek Chat
4. **Mistral** - Mistral Small
5. **xAI** - Grok Beta
6. **Together** - Mixtral 8x7B
7. **Perplexity** - Llama 3.1 Sonar
8. **Google** - Gemini Pro
9. **Cohere** - Command Light
10. **AI21** - J2 Light
11. **Groq** - Llama 3 8B

## Deployment Steps

### 1. Deploy to Render
```bash
./deploy_clean_nodejs.sh
```

### 2. Verify Deployment
Go to https://dashboard.render.com and check the 'sophisticated-runner' service logs.

### 3. Test the Service
```bash
./test_clean_service.sh https://sophisticated-runner.onrender.com
```

## API Endpoints

### Health Check
```bash
GET /health
```
Returns service status and list of healthy providers.

### Get Pending Count
```bash
GET /api/pending-count
```
Returns number of pending domains.

### Process Domains
```bash
POST /api/process-domains
{
  "limit": 5  // Optional, defaults to 5
}
```
Manually trigger domain processing.

## Environment Variables
The service uses the following environment variables (already configured in render.yaml):
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `MISTRAL_API_KEY` - Mistral API key
- `XAI_API_KEY` - xAI API key
- `TOGETHER_API_KEY` - Together API key
- `PERPLEXITY_API_KEY` - Perplexity API key
- `GOOGLE_API_KEY` - Google API key
- `COHERE_API_KEY` - Cohere API key
- `AI21_API_KEY` - AI21 API key
- `GROQ_API_KEY` - Groq API key

## Auto-Processing
The service automatically processes 5 domains every 30 seconds. No manual intervention needed!

## Monitoring
Check the Render dashboard for:
- Service health status
- Deployment logs
- Runtime logs
- Resource usage

## Troubleshooting

### Service Not Starting
Check the logs in Render dashboard. Common issues:
- Missing environment variables
- Database connection issues

### No Domains Processing
1. Check if there are pending domains: `GET /api/pending-count`
2. Check which providers are healthy: `GET /health`
3. Manually trigger processing: `POST /api/process-domains`

### Provider Errors
The service gracefully handles provider errors. If a provider fails, it continues with others.

## Success Metrics
- ✅ Service deployed and running
- ✅ Health check returns 200 OK
- ✅ At least 5 providers are healthy
- ✅ Domains are being processed
- ✅ No deployment errors

## Next Steps
1. Monitor the service for 24 hours
2. Check domain processing rate
3. Verify all providers are working
4. Scale up if needed (increase batch size or frequency)