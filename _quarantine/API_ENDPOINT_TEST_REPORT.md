# API Endpoint Test Report

Generated: 2025-07-29T05:32:29.209Z

## Summary

- **Total Tests**: 57
- **Passed**: 4
- **Failed**: 53
- **Warnings**: 0
- **Success Rate**: 7.0%

## Public API (llmrank.io)

| Endpoint | Method | Status | Response Time | Auth | Notes |
|----------|--------|--------|---------------|------|-------|
| https://llmrank.io/ | GET | ✅ PASS | 239ms | No |  |
| https://llmrank.io/health | GET | ✅ PASS | 277ms | No |  |
| https://llmrank.io/api/domains | GET | ❌ FAIL | 150ms | No | HTTP 500 |
| https://llmrank.io/api/domains/google.com/public | GET | ❌ FAIL | 158ms | No | HTTP 500 |
| https://llmrank.io/api/rankings | GET | ❌ FAIL | 145ms | No | HTTP 500 |
| https://llmrank.io/api/categories | GET | ❌ FAIL | 154ms | No | HTTP 500 |
| https://llmrank.io/api/shadows | GET | ❌ FAIL | 215ms | No | HTTP 500 |
| https://llmrank.io/api/stats | GET | ❌ FAIL | 158ms | No | HTTP 500 |
| https://llmrank.io/api/fire-alarm-dashboard | GET | ❌ FAIL | 199ms | No | HTTP 500 |
| https://llmrank.io/api/volatility/rankings | GET | ❌ FAIL | 204ms | No | HTTP 403 |
| https://llmrank.io/api/tensors/google.com | GET | ❌ FAIL | 292ms | Yes | HTTP 403 |
| https://llmrank.io/api/drift/google.com | GET | ❌ FAIL | 212ms | Yes | HTTP 403 |
| https://llmrank.io/api/consensus/google.com | GET | ❌ FAIL | 200ms | Yes | HTTP 403 |
| https://llmrank.io/api/usage | GET | ❌ FAIL | 274ms | Yes | HTTP 403 |

## Sophisticated Runner Service

| Endpoint | Method | Status | Response Time | Auth | Notes |
|----------|--------|--------|---------------|------|-------|
| https://sophisticated-runner.onrender.com/health | GET | ✅ PASS | 172ms | No |  |
| https://sophisticated-runner.onrender.com/api-keys | GET | ❌ FAIL | 151ms | Yes | HTTP 404 |
| https://sophisticated-runner.onrender.com/process-pending-domains | POST | ❌ FAIL | 205ms | Yes | HTTP 404 |
| https://sophisticated-runner.onrender.com/volatility/scores | GET | ❌ FAIL | 153ms | No | HTTP 404 |
| https://sophisticated-runner.onrender.com/volatility/tiered-rankings | GET | ❌ FAIL | 166ms | No | HTTP 404 |
| https://sophisticated-runner.onrender.com/volatility/category-analysis | GET | ❌ FAIL | 162ms | No | HTTP 404 |
| https://sophisticated-runner.onrender.com/memory-oracle/status | GET | ❌ FAIL | 220ms | No | HTTP 404 |
| https://sophisticated-runner.onrender.com/swarm/status | GET | ❌ FAIL | 175ms | No | HTTP 404 |
| https://sophisticated-runner.onrender.com/swarm/metrics | GET | ❌ FAIL | 213ms | No | HTTP 404 |

## Monitoring Dashboard

| Endpoint | Method | Status | Response Time | Notes |
|----------|--------|--------|---------------|-------|
| https://monitoring-dashboard.onrender.com/ | GET | ❌ FAIL | 595ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/health | GET | ❌ FAIL | 548ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/dashboard | GET | ❌ FAIL | 288ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/dashboard/summary | GET | ❌ FAIL | 603ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/dashboard/services | GET | ❌ FAIL | 556ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/dashboard/processing | GET | ❌ FAIL | 286ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/metrics | GET | ❌ FAIL | 263ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/metrics/prometheus | GET | ❌ FAIL | 575ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/alerts | GET | ❌ FAIL | 255ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/alerts/active | GET | ❌ FAIL | 269ms | HTTP 404 |
| https://monitoring-dashboard.onrender.com/alerts/history | GET | ❌ FAIL | 587ms | HTTP 404 |

## Memory Oracle Service

| Endpoint | Method | Status | Response Time | Auth | Notes |
|----------|--------|--------|---------------|------|-------|
| https://memory-oracle.onrender.com/health | GET | ❌ FAIL | 182ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/compute | POST | ❌ FAIL | 190ms | Yes | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/query | POST | ❌ FAIL | 188ms | Yes | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/memory/google.com | GET | ❌ FAIL | 173ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/memory/top/10 | GET | ❌ FAIL | 243ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/sentiment/google.com | GET | ❌ FAIL | 170ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/sentiment/google.com/trends/30 | GET | ❌ FAIL | 258ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/sentiment/market/distribution | GET | ❌ FAIL | 169ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/tensors/grounding/google.com | GET | ❌ FAIL | 182ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/drift/detect | GET | ❌ FAIL | 255ms | No | HTTP 404 |
| https://memory-oracle.onrender.com/consensus/compute | GET | ❌ FAIL | 181ms | No | HTTP 404 |

## Other Services Health Status

| Service | Status | Response Time | Notes |
|---------|--------|---------------|-------|
| SEO Metrics | ❌ FAIL | 243ms | HTTP 502 |
| Domain Processor V2 | ❌ FAIL | 202ms | HTTP 404 |
| Cohort Intelligence | ❌ FAIL | 290ms | HTTP 404 |
| Industry Intelligence | ❌ FAIL | 173ms | HTTP 404 |
| News Correlation | ❌ FAIL | 239ms | HTTP 404 |
| Swarm Intelligence | ❌ FAIL | 194ms | HTTP 404 |
| Weekly Scheduler | ❌ FAIL | 196ms | HTTP 404 |
| Visceral Intelligence | ❌ FAIL | 206ms | HTTP 404 |
| Reality Validator | ❌ FAIL | 190ms | HTTP 404 |
| Predictive Analytics | ❌ FAIL | N/Ams | Request timeout |
| Embedding Engine | ✅ PASS | 186ms |  |
| Database Manager | ❌ FAIL | 201ms | HTTP 404 |

## Critical Findings

- ⚠️ Public API has failing endpoints
- ⚠️ More than 20% of endpoints are failing
- ⚠️ Some authenticated endpoints are not properly secured

## Recommendations

1. **Response Times**: Average response time is 247ms
2. **Authentication**: 0/8 authenticated endpoints working correctly
3. **Service Health**: 1/12 services are healthy
