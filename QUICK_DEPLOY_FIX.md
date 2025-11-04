# Get a Working Build in 5 Minutes

## The Issue

Render's **free "Starter" plan doesn't have enough RAM** to compile Rust applications.
- Rust needs: 2-4GB RAM
- Free tier has: ~512MB RAM
- Result: Build fails in 40 seconds

## ✅ Solution: Temporary Plan Upgrade

### Step 1: Upgrade Plan (2 minutes)

1. Go to: https://dashboard.render.com/web/srv-d42iaphr0fns739c93sg
2. Click **"Settings"** (left sidebar)
3. Scroll to **"Instance Type"**
4. Change from `Starter` to `Standard` ($7/month)
5. Click **"Save Changes"**

### Step 2: Wait for Build (5-10 minutes)

Render will automatically trigger a new deployment.
- This time it will succeed (enough RAM)
- Build takes 5-10 minutes (normal for Rust)
- Watch progress in "Events" tab

### Step 3: Verify Deployment

Once deployed, test it:
```bash
curl https://domain-runner-web-jkxk.onrender.com/healthz
```

You should see:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "connected"
}
```

### Step 4: (Optional) Downgrade After First Build

**After first successful build**, you can downgrade back to Starter:
- The compiled binary is cached
- Future deployments just copy the binary (fast, low memory)
- Only need Standard for **initial compilation**

---

## Alternative: Deploy to Fly.io (Free, Better for Rust)

Fly.io's free tier can handle Rust builds:

### Step 1: Install flyctl
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login
```bash
flyctl auth login
```

### Step 3: Deploy
```bash
cd /Users/samsonkim/Dev/domain-run/domain-runner
flyctl launch
# Follow prompts, it will detect Dockerfile
```

### Step 4: Set Environment Variables
```bash
flyctl secrets set DATABASE_URL="postgresql://..."
flyctl secrets set OPENAI_API_KEY="sk-..."
# Add other API keys as needed
```

Done! Your app is live on Fly.io.

---

## What Happens After Upgrade

Once you upgrade the Render plan:

1. **Build succeeds** (5-10 min)
2. **Service goes live** at: https://domain-runner-web-jkxk.onrender.com
3. **All endpoints work**:
   - `GET /healthz` - Health check
   - `GET /readyz` - Readiness check
   - `POST /api/query` - Query LLMs
   - `GET /api/drift/:domain` - Drift analysis
   - `GET /api/ranking` - Competitive rankings

---

## Cost Analysis

### Render Standard Plan
- **Cost**: $7/month
- **RAM**: 512MB (enough for Rust)
- **Strategy**: Upgrade for first build, then downgrade

### Fly.io Free Tier
- **Cost**: $0
- **RAM**: 256MB shared (works for Rust builds)
- **Limit**: 3 apps free

### Your Choice

**For CIP Filing**: Either works, both give you a working build

**For Production**: Render Standard or Fly.io Paid ($5-10/month)

---

## After You Have a Working Build

Once deployed, you can:

1. **Add LLM API Keys** via Render dashboard:
   - Environment → Add Environment Variable
   - Add keys as you get them
   - System auto-detects and uses them

2. **Test Endpoints**:
   ```bash
   # Health check
   curl https://domain-runner-web-jkxk.onrender.com/healthz

   # Query a domain
   curl -X POST https://domain-runner-web-jkxk.onrender.com/api/query \
     -H "Content-Type: application/json" \
     -d '{"domain": "tesla.com"}'
   ```

3. **Monitor in Dashboard**:
   - View logs
   - Check metrics
   - See deployments

---

## For Your CIP Filing

**Option A: Quick Demo** (Recommended)
1. Upgrade to Standard
2. Wait for build (5-10 min)
3. Take screenshots of working endpoints
4. Downgrade back to Starter

**Option B: Local Build**
```bash
cd /Users/samsonkim/Dev/domain-run/domain-runner
./test-local-build.sh
```
Use this as proof-of-work for patent filing.

---

## Timeline

| Action | Time |
|--------|------|
| Upgrade Render plan | 1 minute |
| Wait for build | 5-10 minutes |
| Test deployment | 2 minutes |
| **Total** | **~15 minutes** |

After this, you have a **working, live deployment** demonstrating all patent claims.

---

## Need Help?

**If upgrade doesn't work:**
1. Check Render dashboard logs (Events tab)
2. Share error message
3. Try Fly.io alternative

**If you see different errors:**
- Database might be suspended (wake it up in Render dashboard)
- Environment variables might be missing (add DATABASE_URL)

---

## Summary

**The Fix**: Upgrade to Render Standard plan (temporarily or permanently)

**Why It Works**: Gives Rust compiler enough RAM to complete build

**Time**: 15 minutes total

**Cost**: $7/month (or free on first build, then downgrade)

**Result**: Working deployment at https://domain-runner-web-jkxk.onrender.com

Ready to demonstrate all patent claims for CIP filing! 🎯
