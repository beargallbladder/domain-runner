# Weekly Scheduler Service

Automated domain processing scheduler with cron-based triggers for the Domain Runner system.

## Features

- **Cron-based Scheduling**: Automated weekly, daily, and hourly processing schedules
- **Multiple Processing Modes**: Full, incremental, and priority processing
- **Job Management**: Track, monitor, and manage processing jobs
- **Health Monitoring**: Built-in health checks for services and dependencies
- **Notifications**: Slack and email alerts for job status
- **Graceful Failure Handling**: Retry logic and error recovery
- **RESTful API**: Manual triggers and configuration management

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Scheduling (cron patterns)
WEEKLY_SCHEDULE="0 0 * * 0"      # Sunday at midnight
DAILY_SCHEDULE="0 2 * * *"       # 2 AM daily
HOURLY_SCHEDULE="0 * * * *"      # Every hour

# Enable/disable schedules
WEEKLY_ENABLED=true
DAILY_ENABLED=false
HOURLY_ENABLED=false

# Target service URLs
SOPHISTICATED_RUNNER_URL=https://sophisticated-runner.onrender.com
PUBLIC_API_URL=https://llmrank.io

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL_RECIPIENTS=admin@example.com,team@example.com
ALERT_ON_SUCCESS=false

# Service configuration
PORT=3010
LOG_LEVEL=info
NODE_ENV=production
```

## API Endpoints

### Health & Status

- `GET /health` - Service health check
- `GET /status` - Scheduler status and active jobs

### Job Management

- `GET /jobs/history` - Get job history
  - Query params: `limit`, `offset`
- `POST /trigger` - Manually trigger processing
  - Body: `{ "mode": "full|incremental|priority", "force": false }`
- `POST /jobs/:jobId/cancel` - Cancel active job

### Configuration

- `PUT /config/schedules/:schedule` - Update schedule configuration
  - Body: `{ "pattern": "cron pattern", "enabled": true }`

## Processing Modes

### Full Processing
- Processes all pending domains
- Batch size: 100
- Max concurrency: 30
- Typically run weekly

### Incremental Processing
- Processes new domains since last run
- Batch size: 50
- Max concurrency: 20
- Can be run daily

### Priority Processing
- Processes high-priority domains only
- Batch size: 25
- Max concurrency: 10
- Suitable for hourly runs

## Database Schema

The service creates a `scheduler_jobs` table to track job history:

```sql
CREATE TABLE scheduler_jobs (
  id VARCHAR(255) PRIMARY KEY,
  mode VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  triggered_by VARCHAR(100) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  processed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring

The service includes comprehensive monitoring:

- **Health Checks**: Database, target services, memory usage
- **Job Metrics**: Success rate, average duration, processing volume
- **Alerts**: Failures, long-running jobs, missed schedules
- **Logging**: Structured JSON logs with Winston

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

The service is configured for deployment on Render.com. Add to `render.yaml`:

```yaml
- type: web
  name: weekly-scheduler
  runtime: node
  plan: starter
  buildCommand: cd services/weekly-scheduler && npm install && npm run build
  startCommand: node dist/index.js
  envVars:
    # ... environment variables
  healthCheckPath: /health
  rootDir: services/weekly-scheduler
```

## Error Handling

- Automatic retry for failed batches
- Graceful shutdown on SIGTERM/SIGINT
- Transaction rollback on database errors
- Circuit breaker for target service failures

## Security

- CORS protection with whitelisted origins
- Database connection SSL in production
- No sensitive data in logs
- API authentication ready (implement as needed)