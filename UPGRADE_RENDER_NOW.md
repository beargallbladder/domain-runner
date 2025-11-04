# Upgrade Render Plan - Exact Steps (2 Minutes)

## Why Upgrade?

**Render's free "Starter" plan cannot build Rust applications.**
- Starter plan: ~512MB RAM
- Rust compilation needs: 2-4GB RAM
- Result: All builds fail in 40 seconds

**Solution: Upgrade to Standard plan ($7/month)**

---

## Step-by-Step Instructions

### 1. Open Your Service Dashboard
Click this link: **https://dashboard.render.com/web/srv-d42iaphr0fns739c93sg**

### 2. Go to Settings
- Look at the left sidebar
- Click **"Settings"** (gear icon)

### 3. Find Instance Type Section
- Scroll down to **"Instance Type"**
- You'll see it currently says: `Starter 512 MB RAM`

### 4. Click "Change Instance Type"
- Click the **"Change Instance Type"** button

### 5. Select Standard Plan
- Choose: **Standard 512 MB RAM** ($7/month)
- This gives enough resources for Rust compilation

### 6. Confirm the Change
- Review the plan details
- Click **"Upgrade Service"** or **"Confirm"**

### 7. Wait for Auto-Deploy
- Render will automatically trigger a new deployment
- This one will succeed! (takes 5-10 minutes)
- Watch progress in the "Events" tab

---

## What Happens Next

**Immediately:**
- Render starts a new deployment
- You'll see it in the "Events" tab
- Status: "Deploy in progress"

**After 5-10 minutes:**
- Build completes successfully ✅
- Service goes live at: `https://domain-runner-web-jkxk.onrender.com`
- All endpoints work!

**Test it:**
```bash
curl https://domain-runner-web-jkxk.onrender.com/healthz
```

Should return:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "connected"
}
```

---

## Cost Breakdown

**Standard Plan:**
- **$7/month** (billed monthly)
- 512 MB RAM (enough for Rust)
- Automatic deploys
- Custom domains
- No sleep after inactivity

**Can you downgrade later?**
- **Yes**, after first successful build
- Binary is cached
- Future deploys just copy binary (fast, low memory)
- Could downgrade back to Starter after first build

---

## Alternative: Keep Standard Plan

**Why keep Standard:**
- More reliable deployments
- Better performance
- No cold starts
- Worth $7/month for production

**If budget is tight:**
- Upgrade now to get working build
- Downgrade after successful deployment
- Or try Fly.io (free tier works)

---

## Troubleshooting

**Don't see "Change Instance Type"?**
- Make sure you're in "Settings" tab
- Scroll down - it's below "Environment" section

**Upgrade button disabled?**
- You might need to add payment method first
- Go to Account Settings → Billing

**Still getting build failures?**
- Wait for current failed deploy to finish
- Then manually click "Manual Deploy" button
- Build will succeed with Standard plan

---

## After Successful Deployment

Once deployed, you can:

1. **Test Endpoints**
   ```bash
   # Health check
   curl https://domain-runner-web-jkxk.onrender.com/healthz

   # Query a domain
   curl -X POST https://domain-runner-web-jkxk.onrender.com/api/query \
     -H "Content-Type: application/json" \
     -d '{"domain":"tesla.com"}'
   ```

2. **Add LLM API Keys**
   - Go to "Environment" tab
   - Add your API keys:
     - `OPENAI_API_KEY`
     - `ANTHROPIC_API_KEY`
     - etc.

3. **Monitor Performance**
   - Check "Metrics" tab
   - View real-time logs
   - See deployment history

---

## Summary

1. ✅ Go to: https://dashboard.render.com/web/srv-d42iaphr0fns739c93sg
2. ✅ Click "Settings" → "Instance Type" → "Change"
3. ✅ Select "Standard 512 MB RAM"
4. ✅ Confirm upgrade
5. ✅ Wait 5-10 minutes for build
6. ✅ Test: `curl https://domain-runner-web-jkxk.onrender.com/healthz`

**Done!** You'll have a working Rust deployment in ~10 minutes.

---

## Questions?

**How much will this cost?**
- $7/month, prorated from today

**Can I cancel anytime?**
- Yes, cancel in Account Settings

**Do I need to pay now?**
- Render will bill your payment method on file

**What if build still fails?**
- Check build logs in "Events" tab
- Database might be suspended (wake it up)
- Share error message for help

---

**Ready?** Click here to start: **https://dashboard.render.com/web/srv-d42iaphr0fns739c93sg**
