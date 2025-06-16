# Data Sanity Monitor

**Simple, reliable monitoring for LLM PageRank data quality.**

## What It Does

**2 Critical Checks Every 10 Minutes:**

1. **Data Quality**: Alerts if >15% of domains have >95% scores (would have caught the 100% issue)
2. **Site Up**: Checks if API is responding and returning data

## Setup

```bash
cd services/monitoring
npm install
export DATABASE_URL="your_postgres_url"
export SLACK_WEBHOOK="your_slack_webhook_url" # optional
npm start
```

## What You'll See

**Normal Operation:**
```
✅ Data quality OK: avg=67%, high=12/450, updated 2h ago
✅ Site up: API responding, Microsoft score=74.2%
✅ All systems healthy
```

**When Broken:**
```
🚨 DATA BROKEN: 387/450 domains have >95% scores (86%)
🚨 SITE DOWN: API returned 500
```

## Deploy to Render

1. Create new Web Service
2. Connect to your repo
3. Set root directory: `services/monitoring`
4. Set environment variables: `DATABASE_URL`, `SLACK_WEBHOOK`
5. Deploy

**That's it. Boring, reliable, catches real issues.** 