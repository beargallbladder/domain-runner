# Domain Processor v2 - Deployment Guide

## Production Deployment Instructions

### Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL 14+** database
3. **Redis 6+** for caching and pub/sub
4. **Docker** (optional, for containerized deployment)

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=domain_processor
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# API Keys (Add all 11 providers)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...
MISTRAL_API_KEY=...
XAI_API_KEY=...
TOGETHER_API_KEY=...
PERPLEXITY_API_KEY=...
COHERE_API_KEY=...
AI21_API_KEY=...
GROQ_API_KEY=...

# Feature Configuration
CONSENSUS_MAX_CONCURRENT=50
CONSENSUS_TIMEOUT=30000
CONSENSUS_CACHE_ENABLED=true
DRIFT_DETECTION_ENABLED=true
DRIFT_ALERTS_ENABLED=true
DRIFT_CHECK_INTERVAL=900000
ZEITGEIST_UPDATE_INTERVAL=300000
ZEITGEIST_REALTIME=true

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Database Setup

1. **Create Database**:
```sql
CREATE DATABASE domain_processor;
```

2. **Run Migrations**:
```bash
cd services/domain-processor-v2
npm run migrate
```

Or manually:
```bash
psql -h your-host -U your-user -d domain_processor -f src/database/migrations/001_week1_features.sql
```

### Installation

1. **Clone Repository**:
```bash
git clone https://github.com/yourusername/domain-runner.git
cd domain-runner/services/domain-processor-v2
```

2. **Install Dependencies**:
```bash
npm install --production
```

3. **Build TypeScript**:
```bash
npm run build
```

### Running the Application

#### Direct Node.js

```bash
npm start
```

#### Using PM2 (Recommended for Production)

1. **Install PM2**:
```bash
npm install -g pm2
```

2. **Start Application**:
```bash
pm2 start ecosystem.config.js --env production
```

3. **Save PM2 Configuration**:
```bash
pm2 save
pm2 startup
```

#### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'domain-processor-v2',
    script: './dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '2G',
    exp_backoff_restart_delay: 100
  }]
};
```

### Docker Deployment

1. **Build Docker Image**:
```bash
docker build -t domain-processor-v2 .
```

2. **Run Container**:
```bash
docker run -d \
  --name domain-processor-v2 \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  domain-processor-v2
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location ~* /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

### Health Checks

1. **Basic Health Check**:
```bash
curl https://api.yourdomain.com/health
```

2. **Detailed Health Check**:
```bash
curl https://api.yourdomain.com/api/v1/consensus/health
curl https://api.yourdomain.com/api/v1/zeitgeist/health
curl https://api.yourdomain.com/api/v1/drift/health
```

### Monitoring Setup

1. **Prometheus Metrics**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'domain-processor'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

2. **Grafana Dashboard**:
Import the dashboard from `monitoring/grafana-dashboard.json`

3. **Alerts**:
```yaml
# alerts.yml
groups:
  - name: domain-processor
    rules:
      - alert: HighDriftScore
        expr: drift_score > 75
        for: 5m
        annotations:
          summary: "High drift score detected"
      
      - alert: ConsensusAPIDown
        expr: up{job="domain-processor"} == 0
        for: 1m
        annotations:
          summary: "Consensus API is down"
```

### Scaling Considerations

1. **Horizontal Scaling**:
   - Use PM2 cluster mode or Kubernetes
   - Ensure Redis is accessible from all instances
   - Use PostgreSQL connection pooling

2. **Vertical Scaling**:
   - Consensus API: CPU-intensive, benefit from more cores
   - Zeitgeist Tracker: Memory-intensive for trend analysis
   - Drift Alerts: I/O-intensive for reality checks

3. **Caching Strategy**:
   - Consensus responses: 1-hour TTL
   - Zeitgeist trends: 5-minute TTL
   - Drift checks: 15-minute TTL

### Security Checklist

- [ ] All API keys stored in environment variables
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database connections use SSL
- [ ] Redis password protected
- [ ] API authentication implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using parameterized queries)
- [ ] XSS protection headers enabled

### Backup Strategy

1. **Database Backups**:
```bash
# Daily backup script
pg_dump -h $DB_HOST -U $DB_USER -d domain_processor | gzip > backup_$(date +%Y%m%d).sql.gz
```

2. **Redis Persistence**:
```redis
# redis.conf
save 900 1
save 300 10
save 60 10000
appendonly yes
```

### Troubleshooting

1. **Check Logs**:
```bash
pm2 logs domain-processor-v2
tail -f logs/error.log
```

2. **Check Database Connection**:
```bash
psql -h $DB_HOST -U $DB_USER -d domain_processor -c "SELECT 1"
```

3. **Check Redis Connection**:
```bash
redis-cli -h $REDIS_HOST ping
```

4. **Common Issues**:
   - **High Memory Usage**: Increase Node.js heap size with `--max-old-space-size=4096`
   - **Slow Consensus**: Check individual provider response times
   - **Drift False Positives**: Adjust drift thresholds in configuration

### Performance Tuning

1. **Node.js Optimizations**:
```bash
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size" npm start
```

2. **PostgreSQL Tuning**:
```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;

-- Optimize for SSD
ALTER SYSTEM SET random_page_cost = 1.1;

-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '4GB';
```

3. **Redis Tuning**:
```redis
# Increase max memory
maxmemory 4gb
maxmemory-policy allkeys-lru
```

### Rollback Plan

1. **Keep Previous Version**:
```bash
pm2 save
cp -r /app/domain-processor-v2 /app/domain-processor-v2-backup
```

2. **Database Migrations Rollback**:
```sql
-- Create rollback script
-- src/database/migrations/001_week1_features_rollback.sql
```

3. **Quick Rollback**:
```bash
pm2 stop domain-processor-v2
mv /app/domain-processor-v2 /app/domain-processor-v2-failed
mv /app/domain-processor-v2-backup /app/domain-processor-v2
pm2 start domain-processor-v2
```

### Go-Live Checklist

- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Redis connection verified
- [ ] All LLM API keys tested
- [ ] SSL certificates installed
- [ ] Monitoring dashboards set up
- [ ] Backup scripts scheduled
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Team trained on new features

### Support Contacts

- **DevOps Team**: devops@yourdomain.com
- **On-Call**: +1-xxx-xxx-xxxx
- **Escalation**: engineering-lead@yourdomain.com

## Post-Deployment

1. **Monitor for 24 hours**:
   - Check error rates
   - Monitor response times
   - Verify drift detection accuracy

2. **Performance Baseline**:
   - Document average response times
   - Record typical memory usage
   - Note peak traffic patterns

3. **Customer Communication**:
   - Announce new features
   - Provide API documentation
   - Share SDK examples