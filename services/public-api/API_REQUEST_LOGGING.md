# API Request Logging System

## Overview

The production API now includes comprehensive request logging with the following features:

1. **Complete Request Tracking**: Every API request is logged with full details
2. **Performance Metrics**: Response times, bandwidth usage, error rates
3. **Usage Analytics**: Real-time usage statistics per API key
4. **Automatic Archival**: Logs older than 90 days are automatically archived
5. **Security Audit Trail**: Complete audit trail for compliance and security

## Database Schema

### Tables Created

1. **api_key_usage_log**: Main logging table
   - Stores every API request with comprehensive details
   - Includes: endpoint, method, IP, user agent, response time, status code
   - Automatically indexed for performance

2. **api_usage_summary**: Pre-aggregated daily summaries
   - Daily usage statistics per API key
   - Endpoint usage breakdown
   - Error tracking and performance metrics

3. **api_key_usage_log_archive**: Archive table for old logs
   - Same structure as main log table
   - Stores logs older than 90 days

### Analytics Views

- **v_daily_api_usage**: Daily usage statistics by API key
- **v_endpoint_usage**: Endpoint popularity and performance metrics

## API Endpoints

### Usage Analytics Endpoints (Protected)

All endpoints require valid API key authentication via `X-API-Key` header.

#### GET /api/usage
Get comprehensive usage overview for your API key.

Query Parameters:
- `days` (optional): Number of days to show (1-90, default: 7)

Response includes:
- Current period statistics
- Today's usage
- Endpoint breakdown
- Daily usage history
- Rate limit information

#### GET /api/usage/errors
Get error summary for your API key.

Query Parameters:
- `days` (optional): Number of days to show (1-30, default: 7)

Response includes:
- Total errors
- Error breakdown by status code and endpoint
- Error messages and counts

#### GET /api/usage/performance
Get detailed performance metrics.

Query Parameters:
- `days` (optional): Number of days to show (1-30, default: 7)

Response includes:
- Performance by endpoint (min/avg/max/p50/p95/p99)
- Hourly usage patterns

#### GET /api/usage/bandwidth
Get bandwidth usage statistics.

Query Parameters:
- `days` (optional): Number of days to show (1-30, default: 7)

Response includes:
- Total bandwidth usage
- Daily bandwidth breakdown
- Average request/response sizes

## Setup Instructions

### 1. Apply Database Migration

```bash
cd services/public-api
export DATABASE_URL="your-database-url"
python apply_logging_migration.py
```

### 2. Update Production API

The production API has been updated to version 3.1.0 with:
- Request logging middleware
- API key authentication middleware
- Usage analytics endpoints

### 3. Deploy Updated API

```bash
# Commit and push changes
git add .
git commit -m "Add comprehensive API request logging system"
git push origin main
```

The Render deployment will automatically update.

## Maintenance

### Automatic Features

- **Daily Counter Reset**: API key daily counters reset at midnight UTC
- **Request Logging**: All requests automatically logged
- **Usage Summary**: Daily summaries generated automatically

### Manual Maintenance

Run the maintenance script periodically (recommended: daily via cron):

```bash
python log_maintenance.py
```

This script:
- Archives logs older than 90 days
- Generates missing usage summaries
- Cleans up orphaned data
- Updates database statistics
- Generates maintenance report

### Setting Up Cron Job

Add to crontab for daily maintenance at 2 AM UTC:

```bash
0 2 * * * cd /path/to/services/public-api && /usr/bin/python3 log_maintenance.py >> /var/log/api_maintenance.log 2>&1
```

## Performance Considerations

1. **Indexes**: All necessary indexes are created for optimal query performance
2. **Archival**: Old logs are automatically moved to archive table
3. **Summaries**: Pre-aggregated summaries for fast analytics
4. **Async Logging**: Non-blocking request logging

## Security Features

1. **IP Tracking**: Client IPs logged (respects proxy headers)
2. **Sensitive Data**: API keys and auth headers are redacted in logs
3. **Audit Trail**: Complete trail for security audits
4. **Rate Limiting**: Integration with rate limit tracking

## Monitoring

### Key Metrics to Monitor

1. **Request Volume**: Total requests per day/hour
2. **Error Rate**: Percentage of failed requests
3. **Response Times**: P95/P99 response times
4. **Active API Keys**: Number of active keys per day
5. **Bandwidth Usage**: Total MB transferred

### Alerts to Set Up

1. High error rate (>5%)
2. Slow response times (P95 > 1000ms)
3. Unusual request volume
4. Failed authentication attempts

## Example Usage

### Check Your API Usage

```bash
curl -H "X-API-Key: your-api-key" \
  https://your-api-domain.com/api/usage?days=30
```

### Check Error Summary

```bash
curl -H "X-API-Key: your-api-key" \
  https://your-api-domain.com/api/usage/errors?days=7
```

### Check Performance Metrics

```bash
curl -H "X-API-Key: your-api-key" \
  https://your-api-domain.com/api/usage/performance
```

## Troubleshooting

### Logs Not Appearing

1. Check middleware is properly added in startup function
2. Verify database connection is established
3. Check for errors in application logs

### Performance Issues

1. Run maintenance script to update statistics
2. Check index usage with `EXPLAIN ANALYZE`
3. Consider increasing archive threshold if table too large

### Missing Summaries

Run the maintenance script to generate missing summaries:
```bash
python log_maintenance.py
```