# 🎯 SENTINEL COMPLETE SETUP & VERIFICATION GUIDE

## ✅ What I've Built for You

All files are created and ready. Here's what you have:

1. **Complete codebase** - All Python scripts, Node.js services, schemas
2. **Fixed all issues** from the verification plan:
   - ✅ Rate limiting and exponential backoff added
   - ✅ Global timeout protection (10 minutes max)
   - ✅ Schema validation enforced
   - ✅ Run immutability guaranteed
   - ✅ Low-risk auto-tuning only
   - ✅ All missing scripts created

3. **Smoke test script** - One command to verify everything

---

## 🚀 QUICK START (5 Minutes)

### Step 1: Navigate to Project
```bash
cd /Users/samkim/domain-runner/sentinel
```

### Step 2: Set Your API Keys
```bash
# Create .env file with your keys
cat > .env << 'EOF'
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
SERVICE_IMPL=node
EOF

# Edit to add your actual keys
nano .env
```

### Step 3: Run the Smoke Test
```bash
# This does EVERYTHING automatically
./smoke-test.sh
```

**The smoke test will:**
- ✅ Check your environment
- ✅ Install all dependencies
- ✅ Create test data (2 brands, 1 model)
- ✅ Run the complete pipeline
- ✅ Validate all outputs
- ✅ Show you the results

**Expected output:**
```
✅ SMOKE TEST PASSED!
```

---

## 📋 MANUAL VERIFICATION (If Smoke Test Passes)

### Check Your Artifacts
```bash
# List all generated files
ls -la runs/latest/

# You should see:
# - plan.json          (execution plan)
# - crawl.jsonl        (LLM responses)
# - score.json         (calculated scores)
# - metrics.json       (performance metrics)
# - error_buckets.json (error classification)
# - run.envelope.json  (complete summary)
```

### View Your Results
```bash
# See the scores
cat runs/latest/score.json | python3 -m json.tool | head -20

# Check metrics
cat runs/latest/metrics.json | python3 -m json.tool

# Check run status (should be "ok" or "partial")
cat runs/latest/run.envelope.json | grep status
```

---

## 🌐 DEPLOY TO RENDER

### Step 1: Push to GitHub
```bash
# Make sure you're in the repo root
cd /Users/samkim/domain-runner

# Add everything
git add .
git commit -m "Add complete Sentinel monitoring system"
git push origin main
```

### Step 2: Create Render Service

1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   ```
   Name: sentinel-api
   Root Directory: sentinel/services/api
   Build Command: npm install
   Start Command: npm start
   ```
5. Add environment variables:
   ```
   OPENAI_API_KEY = [your key]
   ANTHROPIC_API_KEY = [your key]
   NODE_ENV = production
   SENTINEL_INTERNAL_API_KEY = [generate a random string]
   ```
6. Deploy!

### Step 3: Note Your URLs
After deployment, you'll get:
```
Service URL: https://sentinel-api-xxxx.onrender.com
```

Test it:
```bash
curl https://sentinel-api-xxxx.onrender.com/health
# Should return: {"status":"healthy"}
```

---

## ⚙️ GITHUB ACTIONS SETUP

### Step 1: Add Repository Variables
Go to your GitHub repo → Settings → Secrets and variables → Actions → Variables:

Add variable:
- Name: `RENDER_SERVICE_URL`
- Value: Your Render URL from above

### Step 2: Test Manual Run
1. Go to Actions tab
2. Click "Nightly Loop"
3. Click "Run workflow"
4. Watch it execute

---

## ✅ ACCEPTANCE CRITERIA CHECKLIST

### Local Tests (Already Passed if Smoke Test Works)
- [x] All 6 artifacts created in runs/$RUN_ID/
- [x] run.envelope.json status is "ok" or "partial"
- [x] metrics.json contains all required fields
- [x] No unhandled exceptions

### GitHub Actions Tests
- [ ] Push a small change to specs/sentinel.prd.md
- [ ] Verify "On Spec Change" workflow runs green
- [ ] Run "Nightly Loop" manually
- [ ] Check for auto-created PR with parameter tweaks

### API Tests
- [ ] `GET /health` returns 200
- [ ] `GET /api/v1/leaderboard` returns data (after first run)

---

## 🔧 CONFIGURATION FILES TO CUSTOMIZE

### 1. Your Brands (specs/targets.json)
```json
{
  "brands": [
    {"name": "YourBrand", "domain": "yourdomain.com", "priority": "high"},
    {"name": "Competitor", "domain": "competitor.com", "priority": "medium"}
  ],
  "prompt_templates": [
    "What do you know about {brand}?",
    "Tell me about {brand}'s products."
  ]
}
```

### 2. Your Models (specs/models.json)
```json
{
  "models": [
    {
      "provider": "openai",
      "model": "gpt-4",
      "max_tokens": 500
    },
    {
      "provider": "anthropic",
      "model": "claude-3-sonnet-20240229",
      "max_tokens": 500
    }
  ]
}
```

---

## 🚨 TROUBLESHOOTING

### If Smoke Test Fails

**"API key errors":**
```bash
# Check your .env file
cat .env
# Make sure keys are correct and have no extra spaces
```

**"Command not found":**
```bash
# Install Node.js
brew install node

# Install Python
brew install python3
```

**"Permission denied":**
```bash
chmod +x smoke-test.sh
```

### If GitHub Actions Fail

**"Workflow not found":**
- Make sure `.github/workflows/` exists (note the dot!)
- Push all changes: `git push origin main`

**"Run not created":**
- Check RENDER_SERVICE_URL is set in GitHub variables
- Verify Render service is running

---

## 📊 UNDERSTANDING YOUR RESULTS

### Memory Score (0-1)
- **0.8-1.0**: Excellent - AI knows the brand well
- **0.5-0.8**: Good - Decent knowledge
- **0.2-0.5**: Poor - Limited knowledge
- **0-0.2**: Very poor - Almost no knowledge

### Consensus Score (0-1)
- **0.8-1.0**: High agreement between models
- **0.5-0.8**: Moderate agreement
- **0-0.5**: Low agreement (inconsistent info)

### Error Types
- `timeout`: Request took too long
- `rate_limit`: Hit API limits
- `auth`: API key issues
- `network`: Connection problems

---

## ✅ YOU'RE READY!

### Next Steps:
1. **Run smoke test** - Verify everything works locally
2. **Deploy to Render** - Get your API online
3. **Enable GitHub Actions** - Automate nightly runs
4. **Scale up** - Add more brands and models
5. **Monitor** - Check auto-PRs for improvements

### Daily Routine:
- Check for auto-created PRs
- Review proposed parameter changes
- Merge if they look good
- System self-improves!

---

## 📞 QUICK COMMANDS REFERENCE

```bash
# Run full test
./smoke-test.sh

# Check latest results
cat runs/latest/score.json | python3 -m json.tool

# View metrics
cat runs/latest/metrics.json | python3 -m json.tool

# Compare runs
python3 scripts/diff_runs.py --current runs/latest --previous runs/[previous]

# Test API health
curl $RENDER_SERVICE_URL/health
```

---

**Remember**: The system is designed to self-improve. Let it run for a week and it will optimize itself for your specific use case!