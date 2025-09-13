# 🚀 Sentinel Setup - Simple Step-by-Step Guide

## What You'll Be Doing
Setting up a system that monitors how well AI remembers brands. Think of it like a daily health check for AI memory.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] Your OpenAI API key (starts with `sk-`)
- [ ] Your Anthropic API key (starts with `sk-ant-`)
- [ ] A GitHub account
- [ ] A Render account (free tier is fine)

---

## 🎯 Part 1: Local Setup (15 minutes)

### Step 1: Open Terminal and Navigate
```bash
# Go to your project folder
cd /Users/samkim/domain-runner/sentinel
```

### Step 2: Create Your Configuration Files
```bash
# Copy the example files
cp specs/targets.example.json specs/targets.json
cp specs/models.example.json specs/models.json
```

### Step 3: Create Environment File
```bash
# Create a .env file with your API keys
cat > .env << 'EOF'
OPENAI_API_KEY=paste_your_openai_key_here
ANTHROPIC_API_KEY=paste_your_anthropic_key_here
SERVICE_IMPL=node
EOF
```

**⚠️ IMPORTANT**: Edit the .env file and replace:
- `paste_your_openai_key_here` with your actual OpenAI key
- `paste_your_anthropic_key_here` with your actual Anthropic key

```bash
# Edit the file
nano .env
# (or use any text editor you prefer)
```

### Step 4: Install Everything
```bash
# Install Node.js dependencies
npm install --prefix services/runner-node
npm install --prefix services/api

# Install Python dependencies
pip3 install -r scripts/requirements.txt
```

If you get errors:
- For npm errors: Make sure Node.js is installed (`node --version` should show v18 or higher)
- For pip errors: Try `pip` instead of `pip3`

### Step 5: Test Locally (Small Test)
```bash
# Set a test run ID
export RUN_ID="test-$(date +%s)"

# Load your environment variables
source .env

# Create the execution plan
node services/runner-node/src/plan.js \
  --spec specs/sentinel.prd.md \
  --targets specs/targets.json \
  --models specs/models.json \
  --out runs/$RUN_ID/plan.json

# If that worked, you'll see:
# ✅ Created execution plan:
#    - Brands: 5
#    - Models: 4
#    - Total queries: 20
```

### Step 6: Run the Full Test
```bash
# Execute the crawl (this calls the AI APIs)
node services/runner-node/src/crawl.js \
  --plan runs/$RUN_ID/plan.json \
  --out runs/$RUN_ID/crawl.jsonl \
  --parallel 2

# Calculate scores
node services/runner-node/src/score.js \
  --in runs/$RUN_ID/crawl.jsonl \
  --out runs/$RUN_ID/score.json

# Generate metrics
python3 scripts/parse_metrics.py \
  --crawl runs/$RUN_ID/crawl.jsonl \
  --score runs/$RUN_ID/score.json \
  --out runs/$RUN_ID/metrics.json
```

### Step 7: Verify It Worked
```bash
# Check that all files were created
ls runs/$RUN_ID/

# You should see:
# plan.json
# crawl.jsonl
# score.json
# metrics.json
```

---

## 🌐 Part 2: Deploy to Render (10 minutes)

### Step 1: Push Code to GitHub
```bash
# Add all files
git add .

# Commit
git commit -m "Add Sentinel monitoring system"

# Push to GitHub
git push origin main
```

### Step 2: Create Render Service

1. **Go to [render.com](https://render.com)** and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `sentinel-api`
   - **Root Directory**: `sentinel/services/api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**

### Step 3: Add Environment Variables in Render

In Render dashboard for your service:
1. Go to **"Environment"** tab
2. Add these variables:
   ```
   OPENAI_API_KEY = your_openai_key_here
   ANTHROPIC_API_KEY = your_anthropic_key_here
   NODE_ENV = production
   ```
3. Click **"Save Changes"**

### Step 4: Note Your Service URL
After deployment, Render will give you a URL like:
```
https://sentinel-api-xxxx.onrender.com
```
**Save this URL** - you'll need it next.

---

## ⚙️ Part 3: GitHub Setup (5 minutes)

### Step 1: Add GitHub Variables

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"Variables"** tab
4. Click **"New repository variable"**
5. Add:
   - **Name**: `RENDER_SERVICE_URL`
   - **Value**: Your Render URL from above

### Step 2: Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. You should see 4 workflows:
   - On Spec Change
   - Nightly Loop
   - Manual Orchestrate
   - Release & Rollback
3. If you see a message about enabling workflows, click **"I understand, enable them"**

### Step 3: Test Manual Run

1. Go to **Actions** → **"Nightly Loop"**
2. Click **"Run workflow"** → **"Run workflow"** (green button)
3. Wait 2-3 minutes
4. Check if it completed (green checkmark = success)

---

## ✅ Part 4: Verification Checklist

Run these commands to verify everything works:

### Local Check
```bash
# Check latest run
ls -la runs/

# View metrics
cat runs/*/metrics.json | python3 -m json.tool

# Check for errors
cat runs/*/error_buckets.json 2>/dev/null || echo "No errors found"
```

### API Check
```bash
# Replace with your actual Render URL
RENDER_URL="https://sentinel-api-xxxx.onrender.com"

# Test health endpoint
curl $RENDER_URL/health

# Should return:
# {"status":"healthy","timestamp":"2025-01-17T..."}
```

---

## 🆘 Troubleshooting

### "Command not found" Errors

**For `node: command not found`:**
```bash
# Install Node.js
brew install node
# or download from nodejs.org
```

**For `pip3: command not found`:**
```bash
# Install Python
brew install python3
# or download from python.org
```

### API Key Errors

**"Invalid API key" or 401 errors:**
1. Double-check your keys in `.env`
2. Make sure they start with the right prefix:
   - OpenAI: `sk-`
   - Anthropic: `sk-ant-`
3. Re-run: `source .env`

### GitHub Actions Failing

**"Workflow not found":**
1. Make sure files are in `.github/workflows/` (note the dot)
2. Push to GitHub: `git push origin main`

**"No runs folder":**
1. Create it: `mkdir -p runs`
2. Add to git: `git add runs/.gitkeep`

---

## 📊 What Success Looks Like

When everything is working:

1. **Locally**: You can run the test commands and see files in `runs/test-*/`
2. **API**: `curl` to your Render URL returns `{"status":"healthy"}`
3. **GitHub**: "Nightly Loop" workflow shows green checkmark
4. **Data**: You have `score.json` with brand scores

---

## 🎉 You're Done!

Your system will now:
- Run automatically every night at 3 AM UTC
- Monitor how well AI remembers your brands
- Auto-tune itself for better performance
- Create pull requests with improvements

### Next Steps:
1. **Add your brands**: Edit `specs/targets.json`
2. **Add more models**: Edit `specs/models.json`
3. **Check daily**: Look for auto-created pull requests
4. **Scale up**: After a week, add more brands

---

## 📞 Getting Help

If something doesn't work:
1. Copy the error message
2. Note which step you're on
3. Check the Troubleshooting section above

Common fixes:
- Most errors = missing API keys or wrong paths
- "Permission denied" = add `sudo` before the command
- "Not found" = you're in wrong directory (run `pwd` to check)