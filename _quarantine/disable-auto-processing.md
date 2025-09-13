# Disable Auto-Processing

The current service processes 5 domains every 30 seconds automatically. This is NOT what you want.

## To Disable Auto-Processing:

1. Remove or comment out the setInterval in clean-index.ts (lines 404-418)
2. Or set an environment variable to control it

## For Weekly Processing:

Use the `weekly-crawl.sh` script to process ALL domains at once:

```bash
# Run manually
./weekly-crawl.sh

# Or add to cron for weekly runs (every Sunday at midnight)
0 0 * * 0 /home/user/domain-runner/weekly-crawl.sh
```

## Current Processing Rate:
- Auto: 5 domains/30 seconds = 600 domains/hour
- To process 3,183 domains: ~5.3 hours
- Each domain gets 11 LLM responses

## Better Approach:
Create a dedicated endpoint that processes ALL pending domains in batches with proper concurrency control.