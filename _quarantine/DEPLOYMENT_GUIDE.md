# LLM Provider Monitoring & Auto-Healing Deployment Guide

## Overview
This guide covers deploying the future-proof monitoring and auto-healing system that prevents LLM provider failures.

## Components

### 1. Provider Validation System (`provider-validation.ts`)
- **Purpose**: Validates all providers and auto-heals broken ones
- **Features**:
  - Model fallback chains for each provider
  - Flexible API key discovery
  - Auto-healing capabilities
  
**Deployment**: Already integrated into sophisticated-runner service

### 2. Auto-Detection Script (`auto_detect_model_changes.py`)
- **Purpose**: Weekly detection of model deprecations
- **Output**: 
  - Database records of changes
  - `model_updates.ts` file with fixes
  - Optional webhook alerts

**Setup**:
```bash
# Add to crontab (runs every Monday at 9 AM)
0 9 * * 1 cd /path/to/domain-runner && python3 auto_detect_model_changes.py
```

### 3. Real-time Monitoring Dashboard (`monitoring_dashboard.py`)
- **Purpose**: Live monitoring of all 11 providers
- **Features**:
  - Provider status and response times
  - Database activity metrics
  - Recommendations panel

**Running**:
```bash
# Install dependencies
pip install rich psycopg2-binary

# Run dashboard
python3 monitoring_dashboard.py
```

## Validation Endpoints

The sophisticated-runner service now exposes:

- `GET /api/validate-providers` - Full validation of all providers
- `GET /api/environment-keys` - Shows discovered API keys
- `POST /api/auto-heal` - Triggers auto-healing

## Environment Variables

The system now supports flexible key formats:
- `PROVIDER_API_KEY`
- `PROVIDER_API_KEY_1`
- `PROVIDER_API_KEY_2`
- `PROVIDER_API_KEY1`
- `PROVIDER_API_KEY2`

## Monitoring Setup

1. **Render Dashboard**: Check service logs for auto-healing events
2. **Weekly Reports**: Review `model_detection.log`
3. **Real-time**: Run `monitoring_dashboard.py` during operations

## Alert Configuration

Set `ALERT_WEBHOOK_URL` environment variable for Slack/Discord notifications:
```bash
export ALERT_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Database Tables

Two new tables track changes:
- `model_change_detection` - Model deprecation history
- `validation_history` - Provider validation results

## Quick Test

```bash
# Test validation endpoint
curl https://sophisticated-runner.onrender.com/api/validate-providers

# Run auto-detection manually
python3 auto_detect_model_changes.py

# Start monitoring dashboard
python3 monitoring_dashboard.py
```

## Troubleshooting

1. **Provider Fails**: Check `/api/validate-providers` for specific error
2. **Model Deprecated**: Run auto-detection script for fallback suggestions
3. **Key Issues**: Use `/api/environment-keys` to verify key discovery

## Maintenance

- Review weekly detection logs
- Update fallback chains in `provider-validation.ts` as needed
- Monitor dashboard during high-volume operations

This system ensures we'll never have another 2-month debugging saga! 