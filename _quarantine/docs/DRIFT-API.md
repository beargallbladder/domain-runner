# Memory Drift Alert System API

## Overview

The Memory Drift Alert System is an enterprise-tier feature that monitors when AI models' memories diverge from reality. It provides real-time notifications and actionable insights to protect brand reputation.

## Key Features

- **Real-time Drift Detection**: Monitor how AI models perceive your brand vs reality
- **Multi-Factor Analysis**: Combines staleness, consensus confidence, and reality checkpoints
- **Smart Alerts**: Configurable thresholds with email/webhook notifications
- **Actionable Recommendations**: Specific steps to correct drift
- **Historical Tracking**: View drift trends and velocity over time

## Authentication

All Memory Drift API endpoints require Enterprise tier authentication:

```bash
curl -X GET https://domain-runner.onrender.com/api/v2/drift/alerts \
  -H "X-API-Key: YOUR_ENTERPRISE_API_KEY"
```

## API Endpoints

### 1. Analyze Drift

**GET** `/api/v2/drift/:domain/analyze`

Analyze memory drift for a specific domain.

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "overallDrift": 45.5,
    "driftVelocity": 2.3,
    "providers": {
      "aligned": 7,
      "drifting": 3,
      "critical": 1
    },
    "timeline": [
      {
        "date": "2025-01-25T00:00:00.000Z",
        "driftScore": 38.5,
        "consensus": 82.1,
        "event": "Major company announcement"
      }
    ],
    "projectedDrift": 52.3,
    "riskLevel": "high"
  },
  "timestamp": "2025-01-28T10:30:00.000Z"
}
```

### 2. Get Active Alerts

**GET** `/api/v2/drift/alerts`

Retrieve active drift alerts with optional filtering.

**Query Parameters:**
- `domain` (optional): Filter by domain
- `severity` (optional): Filter by severity (critical/high/medium/low)
- `limit` (optional): Max results (1-100, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "drift_example.com_1706442600000",
        "domain": "example.com",
        "severity": "critical",
        "driftScore": 68.5,
        "affectedProviders": [
          {
            "provider": "openai",
            "currentBelief": "Company is pre-IPO startup",
            "expectedBelief": "Company went public in 2024",
            "driftAmount": 25,
            "lastUpdated": "2024-11-28T00:00:00.000Z"
          }
        ],
        "consensus": {
          "current": 72.3,
          "expected": 85.0,
          "deviation": 12.7
        },
        "realityCheckpoints": [
          {
            "source": "SEC Filing",
            "fact": "Revenue $2.5B in Q4 2024",
            "verifiedDate": "2025-01-21T00:00:00.000Z",
            "conflictsWith": "AI models quote Q2 2024 numbers"
          }
        ],
        "recommendation": "URGENT: Immediate action required. 3 providers have critical drift. Launch correction campaign within 24 hours to prevent reputation damage.",
        "alertType": "consensus_breakdown",
        "createdAt": "2025-01-28T10:30:00.000Z"
      }
    ],
    "total": 3,
    "critical": 1,
    "high": 2
  }
}
```

### 3. Subscribe to Alerts

**POST** `/api/v2/drift/subscribe`

Set up automated drift monitoring for a domain.

**Request Body:**
```json
{
  "domain": "example.com",
  "threshold": 20,
  "frequency": "realtime",
  "email": "alerts@company.com",
  "webhook": "https://api.company.com/drift-webhook"
}
```

**Parameters:**
- `threshold`: Minimum drift score to trigger alerts (0-100)
- `frequency`: Alert frequency (realtime/hourly/daily)
- `email` or `webhook`: At least one notification method required

### 4. Get Drift Report

**GET** `/api/v2/drift/:domain/report`

Generate comprehensive drift analysis report.

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "analysis": { /* Full drift analysis */ },
    "alerts": [ /* Active alerts */ ],
    "consensus": {
      "score": 72.3,
      "confidence": 0.68,
      "providers": 11
    },
    "recommendations": [
      "1. IMMEDIATE: Issue press release with updated facts",
      "2. Launch aggressive content campaign across all channels",
      "3. Direct outreach to AI providers with correction requests",
      "4. Monitor social media for misinformation spread"
    ],
    "lastChecked": "2025-01-28T10:30:00.000Z"
  }
}
```

### 5. Create Manual Alert

**POST** `/api/v2/drift/:domain/alert`

Manually trigger a drift alert for immediate attention.

**Request Body (optional):**
```json
{
  "severity": "critical"
}
```

### 6. Get Drift Timeline

**GET** `/api/v2/drift/:domain/timeline`

View historical drift trends (Premium/Enterprise tiers).

**Query Parameters:**
- `days` (optional): Number of days to include (1-90, default: 30)

### 7. Batch Analysis

**POST** `/api/v2/drift/batch`

Analyze multiple domains in parallel.

**Request Body:**
```json
{
  "domains": [
    "example1.com",
    "example2.com",
    "example3.com"
  ]
}
```

## Drift Score Calculation

The drift score (0-100) is calculated based on:

1. **Time Staleness** (30 points max)
   - Days since last AI training data update
   - 2 points per day, capped at 30

2. **Consensus Confidence** (15 points)
   - Added when confidence < 70%
   - Indicates provider disagreement

3. **Reality Conflicts** (40 points)
   - 10 points per conflicting fact
   - Verified against external sources

4. **Provider Outliers** (15 points)
   - 5 points per outlier provider
   - Based on statistical deviation

## Alert Types

- **memory_stale**: Information is outdated
- **fact_divergence**: Facts differ from reality
- **sentiment_shift**: Brand perception changing
- **consensus_breakdown**: Providers disagree significantly

## Risk Levels

- **Critical** (drift ≥ 30): Immediate action required
- **High** (drift ≥ 20): Action within 48 hours
- **Medium** (drift ≥ 10): Plan correction within 1 week
- **Low** (drift < 10): Monitor, no immediate action

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Monitor critical domains
async function monitorDrift() {
  const domains = ['mybrand.com', 'competitor.com'];
  
  for (const domain of domains) {
    const response = await axios.get(
      `https://domain-runner.onrender.com/api/v2/drift/${domain}/analyze`,
      {
        headers: { 'X-API-Key': process.env.ENTERPRISE_API_KEY }
      }
    );
    
    const { overallDrift, riskLevel } = response.data.data;
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      // Trigger internal alert
      console.error(`DRIFT ALERT: ${domain} has ${riskLevel} drift (${overallDrift}%)`);
      
      // Get full report
      const report = await axios.get(
        `https://domain-runner.onrender.com/api/v2/drift/${domain}/report`,
        {
          headers: { 'X-API-Key': process.env.ENTERPRISE_API_KEY }
        }
      );
      
      // Take action based on recommendations
      console.log('Recommendations:', report.data.data.recommendations);
    }
  }
}

// Set up webhook subscription
async function setupDriftMonitoring(domain) {
  await axios.post(
    'https://domain-runner.onrender.com/api/v2/drift/subscribe',
    {
      domain,
      threshold: 20,
      frequency: 'realtime',
      webhook: 'https://api.mycompany.com/webhooks/drift'
    },
    {
      headers: { 'X-API-Key': process.env.ENTERPRISE_API_KEY }
    }
  );
}
```

### Python
```python
import requests
import os

API_KEY = os.environ['ENTERPRISE_API_KEY']
BASE_URL = 'https://domain-runner.onrender.com/api/v2'

def check_drift_status(domain):
    """Check drift status and return actionable insights"""
    headers = {'X-API-Key': API_KEY}
    
    # Analyze drift
    response = requests.get(
        f'{BASE_URL}/drift/{domain}/analyze',
        headers=headers
    )
    
    drift_data = response.json()['data']
    drift_score = drift_data['overallDrift']
    risk_level = drift_data['riskLevel']
    
    print(f"Domain: {domain}")
    print(f"Drift Score: {drift_score:.1f}%")
    print(f"Risk Level: {risk_level.upper()}")
    print(f"Drift Velocity: {drift_data['driftVelocity']:.1f} points/day")
    print(f"Projected Drift (7 days): {drift_data['projectedDrift']:.1f}%")
    
    # Get detailed report if high risk
    if risk_level in ['critical', 'high']:
        report = requests.get(
            f'{BASE_URL}/drift/{domain}/report',
            headers=headers
        ).json()['data']
        
        print("\nRECOMMENDED ACTIONS:")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"{rec}")
        
        print("\nAFFECTED PROVIDERS:")
        for alert in report['alerts']:
            for provider in alert['affectedProviders']:
                print(f"- {provider['provider']}: {provider['currentBelief']}")
                print(f"  Should be: {provider['expectedBelief']}")
    
    return drift_data

# Batch monitoring
def monitor_portfolio(domains):
    """Monitor multiple domains efficiently"""
    headers = {'X-API-Key': API_KEY}
    
    response = requests.post(
        f'{BASE_URL}/drift/batch',
        json={'domains': domains},
        headers=headers
    )
    
    results = response.json()['data']
    critical_domains = results['summary']['criticalDomains']
    
    if critical_domains:
        print(f"⚠️  CRITICAL DRIFT DETECTED: {', '.join(critical_domains)}")
    
    return results
```

### Webhook Handler Example
```javascript
// Express.js webhook handler
app.post('/webhooks/drift', (req, res) => {
  const alert = req.body;
  
  // Log critical alerts
  if (alert.severity === 'critical') {
    logger.error('Critical drift alert received', {
      domain: alert.domain,
      drift: alert.driftScore,
      recommendation: alert.recommendation
    });
    
    // Trigger automated response
    if (alert.driftScore > 50) {
      // Auto-create PR campaign
      launchCorrectionCampaign(alert.domain, alert.affectedProviders);
    }
  }
  
  // Send to Slack
  slack.send({
    text: `🚨 Drift Alert: ${alert.domain}`,
    attachments: [{
      color: alert.severity === 'critical' ? 'danger' : 'warning',
      fields: [
        { title: 'Drift Score', value: `${alert.driftScore}%` },
        { title: 'Severity', value: alert.severity },
        { title: 'Action Required', value: alert.recommendation }
      ]
    }]
  });
  
  res.status(200).send('OK');
});
```

## Best Practices

1. **Set Appropriate Thresholds**
   - Critical brands: 15-20% threshold
   - Regular monitoring: 25-30% threshold
   - Low priority: 35-40% threshold

2. **Response Times**
   - Critical alerts: Respond within 4 hours
   - High alerts: Respond within 24 hours
   - Medium alerts: Plan response within 3 days

3. **Monitoring Frequency**
   - Top brands: Real-time monitoring
   - Important brands: Hourly checks
   - Others: Daily summaries

4. **Correction Strategies**
   - Press releases for major updates
   - Content marketing campaigns
   - Direct AI provider outreach
   - Wikipedia and knowledge base updates
   - Social media clarifications

## Rate Limits

Enterprise tier rate limits:
- 1000 requests per minute
- 50,000 requests per hour
- Batch analysis: 20 domains per request

## Support

For enterprise support:
- Email: enterprise@llmrank.io
- Priority response time: 4 hours
- Dedicated Slack channel available