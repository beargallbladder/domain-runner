# Environment Variables Setup for Render Deployment

This document provides instructions for setting up environment variables for the domain-runner application on Render.

## Required Environment Variables

The following LLM API keys need to be configured in your Render services:

### Core LLM Providers
- `OPENAI_API_KEY` - OpenAI GPT models
- `ANTHROPIC_API_KEY` - Claude models
- `GOOGLE_API_KEY` - Gemini models

### Additional LLM Providers
- `DEEPSEEK_API_KEY` - DeepSeek models
- `MISTRAL_API_KEY` - Mistral AI models
- `COHERE_API_KEY` - Cohere models
- `AI21_API_KEY` - AI21 Jurassic models
- `GROQ_API_KEY` - Groq inference engine
- `TOGETHER_API_KEY` - Together AI models
- `PERPLEXITY_API_KEY` - Perplexity AI models
- `XAI_API_KEY` - xAI Grok models

## Setup Methods

### Method 1: Using Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Navigate to your deployed services

2. **For Web Service (domain-runner-web):**
   - Click on the `domain-runner-web` service
   - Go to "Environment" tab
   - Add each API key as a new environment variable:
     ```
     Key: OPENAI_API_KEY
     Value: your-openai-api-key-here
     ```
   - Repeat for all required keys

3. **For Worker Service (domain-runner-worker):**
   - Click on the `domain-runner-worker` service
   - Go to "Environment" tab
   - Add the same API keys as the web service

### Method 2: Using Render CLI

```bash
# Set environment variables for web service
render service env set --service domain-runner-web OPENAI_API_KEY=your-key-here
render service env set --service domain-runner-web ANTHROPIC_API_KEY=your-key-here
render service env set --service domain-runner-web GOOGLE_API_KEY=your-key-here
# ... repeat for all keys

# Set environment variables for worker service
render service env set --service domain-runner-worker OPENAI_API_KEY=your-key-here
render service env set --service domain-runner-worker ANTHROPIC_API_KEY=your-key-here
render service env set --service domain-runner-worker GOOGLE_API_KEY=your-key-here
# ... repeat for all keys
```

### Method 3: Using Environment Groups (Most Efficient)

1. **Create Environment Group:**
   ```bash
   render env-group create --name llm-api-keys
   ```

2. **Add variables to group:**
   ```bash
   render env-group env set --name llm-api-keys OPENAI_API_KEY=your-key-here
   render env-group env set --name llm-api-keys ANTHROPIC_API_KEY=your-key-here
   # ... repeat for all keys
   ```

3. **Link to services:**
   ```bash
   render service env-group link --service domain-runner-web --env-group llm-api-keys
   render service env-group link --service domain-runner-worker --env-group llm-api-keys
   ```

## Environment Variable Security

### Best Practices:
- ✅ Never commit API keys to version control
- ✅ Use Render's encrypted environment variables
- ✅ Set `sync: false` in render.yaml for sensitive variables
- ✅ Rotate API keys regularly
- ✅ Use environment groups for shared variables

### Security Features:
- All environment variables are encrypted at rest
- Variables marked with `sync: false` are not synced between environments
- Access is logged and auditable

## Testing Environment Variables

After setting up, verify the variables are accessible:

```bash
# Check if variables are set for web service
render service env list --service domain-runner-web

# Check if variables are set for worker service
render service env list --service domain-runner-worker
```

## API Key Sources

### Where to get API keys:

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Anthropic**: https://console.anthropic.com/settings/keys
3. **Google AI**: https://makersuite.google.com/app/apikey
4. **DeepSeek**: https://platform.deepseek.com/api_keys
5. **Mistral**: https://console.mistral.ai/api-keys
6. **Cohere**: https://dashboard.cohere.ai/api-keys
7. **AI21**: https://studio.ai21.com/account/api-key
8. **Groq**: https://console.groq.com/keys
9. **Together**: https://api.together.xyz/settings/api-keys
10. **Perplexity**: https://www.perplexity.ai/settings/api
11. **xAI**: https://console.x.ai/api-keys

## Troubleshooting

### Common Issues:

1. **Service not redeploying after env var changes:**
   ```bash
   render service deploy --service domain-runner-web
   render service deploy --service domain-runner-worker
   ```

2. **Variables not showing in logs:**
   - Check that `sync: false` is set for sensitive variables
   - Variables may be masked in logs for security

3. **API requests failing:**
   - Verify API keys are valid and have sufficient quota
   - Check service logs for specific error messages:
   ```bash
   render service logs --service domain-runner-web --tail
   ```

4. **Database connection issues:**
   - The `DATABASE_URL` is automatically set from the database service
   - Verify database service is running and healthy

## Monitoring

After deployment, monitor the services:

```bash
# Check service status
render service get --service domain-runner-web
render service get --service domain-runner-worker

# View recent logs
render service logs --service domain-runner-web --tail
render service logs --service domain-runner-worker --tail
```

## Next Steps

Once environment variables are configured:

1. Deploy services using the deployment script
2. Verify health endpoints are responding
3. Test API functionality with a sample request
4. Monitor logs for any errors
5. Set up any additional monitoring as needed