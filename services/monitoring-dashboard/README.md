# Monitoring Dashboard Service

A unified monitoring dashboard that aggregates health data from all Domain Runner services, provides metrics, and manages alerts.

## Features

- **Real-time Health Monitoring**: Tracks health status of all services
- **Metrics Collection**: Collects and aggregates metrics from all services
- **Alert Management**: Automatic alert generation based on predefined rules
- **WebSocket Support**: Real-time updates for connected clients
- **Prometheus Integration**: Compatible with Prometheus for metrics scraping
- **Dashboard API**: RESTful API for dashboard data

## Endpoints

### Dashboard
- `GET /` - Root endpoint with service information
- `GET /health` - Health check endpoint
- `GET /dashboard` - Full dashboard data
- `GET /dashboard/summary` - Summary statistics
- `GET /dashboard/services` - Detailed service status
- `GET /dashboard/processing` - Domain processing status
- `GET /dashboard/comparison` - Service comparison metrics

### Metrics
- `GET /metrics` - All metrics in JSON format
- `GET /metrics/prometheus` - Prometheus-compatible metrics
- `GET /metrics/database` - Database metrics only
- `GET /metrics/service/:serviceName` - Metrics for specific service
- `GET /metrics/cached` - All cached metrics

### Alerts
- `GET /alerts` - All active alerts
- `GET /alerts/active` - Active alerts only
- `GET /alerts/history` - Alert history
- `GET /alerts/severity/:severity` - Alerts by severity
- `GET /alerts/service/:serviceName` - Alerts by service
- `POST /alerts/:alertId/acknowledge` - Acknowledge an alert
- `POST /alerts/:alertId/resolve` - Resolve an alert
- `POST /alerts/clear-resolved` - Clear resolved alerts

## WebSocket Events

Connect to the WebSocket endpoint to receive real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3020');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(message.type, message.data);
});
```

Event types:
- `dashboard:full` - Full dashboard update
- `health:update` - Health status update
- `metrics:update` - Metrics update
- `alerts:new` - New alerts

## Alert Rules

The service automatically monitors for:
- Service down/unhealthy
- Service degraded performance
- High response times (>3000ms)
- High pending domains (>5000)
- Low processing rate (<10/hour with >100 pending)
- High failure rate (>10%)

## Environment Variables

- `PORT` - Service port (default: 3020)
- `DATABASE_URL` - PostgreSQL connection string
- `LOG_LEVEL` - Logging level (default: info)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

### Service URLs (optional)
- `SOPHISTICATED_RUNNER_URL`
- `DOMAIN_PROCESSOR_V2_URL`
- `PUBLIC_API_URL`
- `SEO_METRICS_URL`
- `COHORT_INTELLIGENCE_URL`
- `INDUSTRY_INTELLIGENCE_URL`
- `NEWS_CORRELATION_URL`
- `SWARM_INTELLIGENCE_URL`
- `MEMORY_ORACLE_URL`
- `WEEKLY_SCHEDULER_URL`
- `VISCERAL_INTELLIGENCE_URL`
- `REALITY_VALIDATOR_URL`
- `PREDICTIVE_ANALYTICS_URL`
- `EMBEDDING_ENGINE_URL`
- `DATABASE_MANAGER_URL`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```