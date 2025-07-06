#!/usr/bin/env ts-node

/*
🛡️ TENSOR HEALTH CHECKER
Validates system health before allowing weekly crawls
Prevents data corruption from infrastructure failures
*/

import { Pool } from 'pg';
import axios from 'axios';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/health-check.log' }),
    new transports.Console()
  ]
});

interface HealthCheckResult {
  passed: boolean;
  issues: string[];
  metrics: {
    recentResponses: number;
    activeModels: number;
    activeDomains: number;
    avgResponseLength: number;
  };
}

class TensorHealthChecker {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async runFullHealthCheck(): Promise<HealthCheckResult> {
    logger.info('🔍 Starting comprehensive tensor health check');
    
    const issues: string[] = [];
    let metrics = {
      recentResponses: 0,
      activeModels: 0,
      activeDomains: 0,
      avgResponseLength: 0
    };

    try {
      // 1. Database connectivity check
      await this.checkDatabaseHealth();
      logger.info('✅ Database connectivity: HEALTHY');

      // 2. Recent response volume check
      const responseCheck = await this.checkRecentResponseVolume();
      metrics.recentResponses = responseCheck.count;
      if (responseCheck.count < 1000) {
        issues.push(`LOW_RESPONSE_VOLUME: Only ${responseCheck.count} responses in last 7 days (expected >1000)`);
      }

      // 3. AI Model coverage check
      const modelCheck = await this.checkActiveModels();
      metrics.activeModels = modelCheck.count;
      if (modelCheck.count < 6) {
        issues.push(`INSUFFICIENT_MODEL_COVERAGE: Only ${modelCheck.count} models active (expected ≥6)`);
      }

      // 4. Domain coverage check
      const domainCheck = await this.checkActiveDomains();
      metrics.activeDomains = domainCheck.count;
      if (domainCheck.count < 100) {
        issues.push(`LOW_DOMAIN_COVERAGE: Only ${domainCheck.count} domains processed (expected ≥100)`);
      }

      // 5. Response quality check
      const qualityCheck = await this.checkResponseQuality();
      metrics.avgResponseLength = qualityCheck.avgLength;
      if (qualityCheck.avgLength < 500) {
        issues.push(`POOR_RESPONSE_QUALITY: Average length ${qualityCheck.avgLength} chars (expected ≥500)`);
      }

      // 6. Infrastructure endpoint health
      await this.checkInfrastructureEndpoints();
      logger.info('✅ Infrastructure endpoints: HEALTHY');

      // 7. Rate limit status check
      await this.checkRateLimitStatus();
      logger.info('✅ Rate limits: HEALTHY');

    } catch (error) {
      const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
      issues.push(`SYSTEM_ERROR: ${errorMessage}`);
      logger.error('❌ Health check failed with system error', { error: errorMessage });
    }

    const passed = issues.length === 0;
    
    logger.info(`🎯 Health check completed: ${passed ? 'PASSED' : 'FAILED'}`, {
      passed,
      issueCount: issues.length,
      metrics
    });

    return { passed, issues, metrics };
  }

  private async checkDatabaseHealth(): Promise<void> {
    const result = await this.pool.query('SELECT NOW() as current_time, COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
    if (!result.rows[0]) {
      throw new Error('Database query returned no results');
    }
  }

  private async checkRecentResponseVolume(): Promise<{ count: number }> {
    const result = await this.pool.query(`
      SELECT COUNT(*) as recent_count
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    return { count: parseInt(result.rows[0].recent_count) };
  }

  private async checkActiveModels(): Promise<{ count: number }> {
    const result = await this.pool.query(`
      SELECT COUNT(DISTINCT model) as model_count
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '3 days'
    `);
    return { count: parseInt(result.rows[0].model_count) };
  }

  private async checkActiveDomains(): Promise<{ count: number }> {
    const result = await this.pool.query(`
      SELECT COUNT(DISTINCT domain_id) as domain_count
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '3 days'
    `);
    return { count: parseInt(result.rows[0].domain_count) };
  }

  private async checkResponseQuality(): Promise<{ avgLength: number }> {
    const result = await this.pool.query(`
      SELECT ROUND(AVG(LENGTH(response)), 0) as avg_length
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '24 hours'
      AND response IS NOT NULL
    `);
    return { avgLength: parseInt(result.rows[0].avg_length) || 0 };
  }

  private async checkInfrastructureEndpoints(): Promise<void> {
    const endpoints = [
      'https://sophisticated-runner.onrender.com/health',
      // Add other critical endpoints
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { timeout: 10000 });
        if (response.status !== 200) {
          throw new Error(`Endpoint ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
        throw new Error(`Endpoint ${endpoint} failed: ${errorMessage}`);
      }
    }
  }

  private async checkRateLimitStatus(): Promise<void> {
    // Check if we're approaching rate limits for any providers
    const recentRequests = await this.pool.query(`
      SELECT 
        model,
        COUNT(*) as requests_last_hour
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY model
    `);

    for (const row of recentRequests.rows) {
      const { model, requests_last_hour } = row;
      // Define rate limits per model (adjust based on your limits)
      const rateLimits = {
        'openai': 3000,
        'anthropic': 1800,
        'deepseek': 1200,
        'mistral': 1500,
        'xai': 600,
        'together': 720,
        'perplexity': 900,
        'google': 360
      };

      const limit = rateLimits[model.toLowerCase() as keyof typeof rateLimits] || 1000;
      if (requests_last_hour > limit * 0.8) { // 80% threshold
        logger.warn(`⚠️ Rate limit warning for ${model}: ${requests_last_hour}/${limit} requests in last hour`);
      }
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI execution
async function main() {
  const checker = new TensorHealthChecker();
  
  try {
    const result = await checker.runFullHealthCheck();
    
    if (result.passed) {
      logger.info('🎉 System is HEALTHY - Ready for weekly tensor crawl');
      process.exit(0);
    } else {
      logger.error('🚨 System FAILED health check - Weekly crawl BLOCKED', {
        issues: result.issues
      });
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logger.error('💥 Health check crashed', { error: errorMessage });
    process.exit(1);
  } finally {
    await checker.close();
  }
}

if (require.main === module) {
  main();
}

export { TensorHealthChecker, HealthCheckResult }; 