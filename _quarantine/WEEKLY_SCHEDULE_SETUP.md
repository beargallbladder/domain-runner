# 🗓️ WEEKLY FULL LLM PROCESSING SETUP

## Manual Weekly Run:
```bash
node weekly_full_llm_processing.js
```

## Automated Weekly Schedule (Optional):
Add this to your crontab to run every Sunday at 6 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 6 * * 0 cd /Users/samkim/domain-runner && node weekly_full_llm_processing.js >> weekly_processing.log 2>&1

# Or run with PM2 for better management:
pm2 start weekly_full_llm_processing.js --cron "0 6 * * 0" --name "weekly-llm-processing"
```

## Cost & Performance:
- **Frequency**: Every Sunday
- **Cost**: ~$85 per run
- **Duration**: 6-12 hours  
- **Coverage**: All domains × 8 models × 3 prompts
- **Output**: Complete competitive intelligence tensor

## Manual Trigger Anytime:
```bash
# Trigger immediate full processing
node weekly_full_llm_processing.js
```
