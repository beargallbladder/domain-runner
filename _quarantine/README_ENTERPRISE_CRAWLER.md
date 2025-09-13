# Enterprise Domain Crawler

## Production-Grade Swarm System

This enterprise crawler respects individual LLM rate limits while maximizing throughput through intelligent orchestration.

## Key Features

✅ **Rate-Limit Aware**: Each LLM provider has individual rate limiting  
✅ **Concurrent Processing**: Workers run in parallel without interference  
✅ **Circuit Breakers**: Automatic failover and recovery  
✅ **Health Monitoring**: Real-time metrics and alerting  
✅ **Database Persistence**: Reliable storage with connection pooling  
✅ **Production Ready**: Logging, monitoring, and deployment scripts  

## Quick Start

### 1. Set API Keys (Required for Production)

```bash
# Set your actual API keys
export OPENAI_API_KEY_1="sk-your-openai-key"
export ANTHROPIC_API_KEY_1="sk-ant-your-anthropic-key"
export GROQ_API_KEY_1="gsk-your-groq-key"
export DEEPSEEK_API_KEY_1="sk-your-deepseek-key"
# ... add other providers as needed
```

### 2. Start the Crawler

```bash
# Make script executable
chmod +x run_enterprise_crawler.sh

# Start the crawler
./run_enterprise_crawler.sh start
```

### 3. Monitor Progress

```bash
# Real-time monitoring
./run_enterprise_crawler.sh monitor

# Check status
./run_enterprise_crawler.sh status

# View logs
./run_enterprise_crawler.sh logs
```

## Rate Limits by Provider

| Provider | RPM | RPH | Concurrent | Notes |
|----------|-----|-----|------------|-------|
| OpenAI | 500 | 10,000 | 50 | GPT-4o-mini tier |
| Anthropic | 50 | 1,000 | 10 | Claude Haiku |
| Groq | 30 | 500 | 10 | Strict limits |
| DeepSeek | 60 | 1,000 | 20 | Good throughput |
| Perplexity | 20 | 300 | 5 | Very strict |

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌────────────┐
│  Task Queue     │    │  Rate        │    │  Database  │
│                 │    │  Limiters    │    │  Pool      │
│ - Priority      │    │              │    │            │
│ - Per-Provider  │    │ - Token      │    │ - 5-20     │
│ - Async         │    │   Bucket     │    │   Conns    │
└─────────────────┘    │ - Backoff    │    │ - Failover │
                       │ - Circuit    │    └────────────┘
                       │   Breaker    │
                       └──────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌─────────▼─────┐    ┌─────────▼──────┐
│ OpenAI       │    │ Anthropic     │    │ Groq           │
│ Worker       │    │ Worker        │    │ Worker         │
│              │    │               │    │                │
│ 50 concurrent│    │ 10 concurrent │    │ 10 concurrent  │
│ 500 RPM      │    │ 50 RPM        │    │ 30 RPM         │
└──────────────┘    └───────────────┘    └────────────────┘
```

## Commands Reference

```bash
# Start crawler
./run_enterprise_crawler.sh start

# Stop crawler  
./run_enterprise_crawler.sh stop

# Restart crawler
./run_enterprise_crawler.sh restart

# Show status and metrics
./run_enterprise_crawler.sh status

# Real-time monitoring (refreshes every 5s)
./run_enterprise_crawler.sh monitor

# Show recent logs
./run_enterprise_crawler.sh logs
```

## Production Deployment

### On Render/Heroku:

1. Set environment variables for all API keys
2. Deploy the Python files
3. Run: `python3 deploy_enterprise_crawler.py`

### Local Development:

1. Set API keys in your shell
2. Run: `./run_enterprise_crawler.sh start`

## Monitoring

The system creates comprehensive metrics:

- **Response rates** per provider
- **Success/failure** counts  
- **Average response times**
- **Queue depths**
- **Rate limit hits**
- **Worker health status**

Check the `crawler_metrics` and `crawler_health` tables for data.

## Troubleshooting

### High Failure Rates
- Check API keys are valid
- Verify rate limits aren't exceeded
- Check network connectivity

### Slow Processing
- Increase worker concurrency
- Add more API keys for rotation
- Scale up to multiple instances

### Memory Issues
- Reduce batch sizes
- Increase database connection pool
- Monitor memory usage

## Files

- `enterprise_crawler_system.py` - Main crawler system
- `deploy_enterprise_crawler.py` - Deployment manager  
- `run_enterprise_crawler.sh` - Control script
- `test_enterprise_crawler.py` - Test suite

## Database Schema

The crawler uses these tables:

- `domains` - Domain list and status
- `domain_responses` - LLM responses with metadata
- `crawler_metrics` - Performance metrics
- `crawler_health` - System health checks

## Support

For issues:
1. Check logs: `./run_enterprise_crawler.sh logs`
2. Run tests: `python3 test_enterprise_crawler.py`  
3. Check database: Query `crawler_health` table
4. Monitor rates: Query `crawler_metrics` table