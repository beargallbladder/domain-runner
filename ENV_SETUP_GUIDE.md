# Environment Variables Setup Guide

## Quick Start (Minimum Required)

For the system to run, you only need:

```bash
DATABASE_URL=postgresql://...  # Already configured
```

Everything else is optional and can be added as you get API keys!

---

## Setting Up on Render (Recommended)

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com/web/srv-d42iaphr0fns739c93sg
2. Click "Environment" tab on the left

### Step 2: Add Environment Variables

Click "Add Environment Variable" and add these **one at a time**:

#### Required (Already Set)
```
DATABASE_URL = postgresql://nexus:IbzPnTJnqc8g0JbdVvBVITq5NVf4Rwu3@dpg-d3c6odj7mgec73a930n0-a.oregon-postgres.render.com/domain_runner
```

#### Core Configuration
```
RUST_LOG = info
PORT = 8080
ENABLE_DRIFT_DETECTION = true
ENABLE_COMPETITIVE_RANKING = true
```

#### LLM API Keys (Add as you get them)

**Start with one provider:**
```
OPENAI_API_KEY = sk-...
```

**Then add more as needed:**
```
ANTHROPIC_API_KEY = sk-ant-...
TOGETHER_API_KEY = ...
GOOGLE_AI_API_KEY = ...
COHERE_API_KEY = ...
GROQ_API_KEY = ...
```

### Step 3: Save & Deploy
1. Click "Save Changes"
2. Render will automatically redeploy

---

## Adding New LLM Providers

The system is designed to easily add new LLMs. Here's how:

### Option 1: Add via Environment Variable (No Code Change)

Just add the API key to Render:
```
MY_NEW_LLM_API_KEY = ...
```

Then update `src/llm.rs` to check for it.

### Option 2: Full Integration (Best for Production)

1. **Add to config** (`src/config.rs`):
```rust
pub my_new_llm_api_key: Option<String>,
```

2. **Load from environment** (`src/config.rs`):
```rust
my_new_llm_api_key: env::var("MY_NEW_LLM_API_KEY").ok(),
```

3. **Add provider** (`src/llm.rs`):
```rust
pub async fn query_my_new_llm(&self, prompt: &str) -> Result<LLMResponse> {
    // Implementation
}
```

4. **Update query_all** (`src/llm.rs`):
```rust
if self.my_new_llm_key.is_some() {
    tasks.push(self.query_my_new_llm(prompt));
}
```

---

## Environment Variable Reference

### Critical for Operation

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `PORT` | No | 8080 | Port to run server on |

### LLM Providers (All Optional)

| Variable | Provider | Get Key From |
|----------|----------|--------------|
| `OPENAI_API_KEY` | OpenAI GPT | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Claude | https://console.anthropic.com/settings/keys |
| `TOGETHER_API_KEY` | Together AI | https://api.together.xyz/settings/api-keys |
| `GOOGLE_AI_API_KEY` | Google Gemini | https://makersuite.google.com/app/apikey |
| `COHERE_API_KEY` | Cohere | https://dashboard.cohere.com/api-keys |
| `GROQ_API_KEY` | Groq | https://console.groq.com/keys |
| `PERPLEXITY_API_KEY` | Perplexity | https://www.perplexity.ai/settings/api |
| `MISTRAL_API_KEY` | Mistral | https://console.mistral.ai/api-keys |
| `AI21_API_KEY` | AI21 Jurassic | https://studio.ai21.com/account/api-key |
| `REPLICATE_API_KEY` | Replicate | https://replicate.com/account/api-tokens |
| `HUGGINGFACE_API_KEY` | HuggingFace | https://huggingface.co/settings/tokens |

### Sentinel Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DRIFT_THRESHOLD_STABLE` | 0.3 | Drift score below this = stable |
| `DRIFT_THRESHOLD_DECAYED` | 0.7 | Drift score above this = decayed |
| `SIMILARITY_WINDOW_DAYS` | 7 | Days to look back for baseline |

### LLM Behavior

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_TIMEOUT_SECONDS` | 30 | Timeout for each API call |
| `LLM_MAX_RETRIES` | 2 | Retries on failure |
| `LLM_TEMPERATURE` | 0.0 | Response randomness (0-1) |
| `LLM_MAX_TOKENS` | 500 | Max response length |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_DRIFT_DETECTION` | true | Auto-detect drift on queries |
| `ENABLE_COMPETITIVE_RANKING` | true | Calculate brand rankings |
| `DEMO_MODE` | false | Use synthetic data for demos |
| `MOCK_LLM_RESPONSES` | false | Mock responses (no API calls) |

---

## Local Development Setup

### Option 1: Using .env file

1. Copy the example:
```bash
cp .env.production.example .env
```

2. Edit `.env` and add your API keys:
```bash
nano .env  # or use your editor
```

3. Run:
```bash
cargo run
```

### Option 2: Export in shell

```bash
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
cargo run
```

### Option 3: Inline

```bash
DATABASE_URL="..." OPENAI_API_KEY="..." cargo run
```

---

## Testing Without API Keys

You can test the system without any LLM API keys:

```bash
DEMO_MODE=true MOCK_LLM_RESPONSES=true cargo run
```

This will:
- Use synthetic drift data
- Return mock LLM responses
- Allow testing of all endpoints

---

## Upgrading to Add New LLMs

### Scenario: You just got a Groq API key

**On Render:**
1. Go to Environment tab
2. Click "Add Environment Variable"
3. Key: `GROQ_API_KEY`
4. Value: `gsk_...`
5. Save

**System automatically:**
- Detects the new key
- Starts querying Groq in parallel with other providers
- Includes Groq responses in drift analysis
- Updates competitive rankings

**No code changes needed!** (if Groq support exists in `src/llm.rs`)

### Scenario: You want to add a brand new provider

1. Add API key to Render environment
2. Update `src/llm.rs` to add provider support
3. Git commit and push
4. Render auto-deploys

---

## Security Best Practices

### For Production:

1. **Never commit API keys to Git**
   - Already protected by `.gitignore`
   - Use environment variables only

2. **Rotate keys regularly**
   - Update in Render dashboard
   - No code changes needed

3. **Use different keys per environment**
   - Development keys
   - Staging keys
   - Production keys

4. **Monitor API usage**
   - Set up billing alerts
   - Check provider dashboards

5. **Enable rate limiting**
   ```
   RATE_LIMIT_PER_MINUTE=60
   MAX_CONCURRENT_REQUESTS=100
   ```

---

## Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` is set correctly
- Verify database is not suspended on Render

### "LLM provider not responding"
- Check API key is valid
- Verify key has credits/quota
- Check `LLM_TIMEOUT_SECONDS` isn't too low

### "Missing environment variable"
- Only `DATABASE_URL` is required
- All LLM keys are optional
- Check spelling matches exactly

---

## For Your CIP Filing

**Minimal setup needed:**
```
DATABASE_URL = <your postgres url>
```

**For full demonstration:**
```
DATABASE_URL = <your postgres url>
OPENAI_API_KEY = <your key>
ANTHROPIC_API_KEY = <your key>
TOGETHER_API_KEY = <your key>
```

All other variables have sensible defaults!

---

## Quick Reference Card

```bash
# REQUIRED
DATABASE_URL=postgresql://...

# START WITH (pick 1-3)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TOGETHER_API_KEY=...

# ADD LATER AS NEEDED
GOOGLE_AI_API_KEY=...
COHERE_API_KEY=...
GROQ_API_KEY=...
# ... etc

# OPTIONAL TUNING
DRIFT_THRESHOLD_STABLE=0.3
LLM_TIMEOUT_SECONDS=30
RUST_LOG=info
```

**That's it!** The system handles the rest automatically.
