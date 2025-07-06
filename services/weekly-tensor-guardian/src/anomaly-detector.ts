#!/usr/bin/env ts-node

/*
🚨 TENSOR ANOMALY DETECTOR
Distinguishes between infrastructure failures and true AI memory decay
Critical for maintaining data integrity in temporal analysis
*/

import { Pool } from 'pg';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/anomaly-detection.log' }),
    new transports.Console()
  ]
});

interface AnomalyResult {
  detected: boolean;
  anomalies: Anomaly[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

interface Anomaly {
  type: 'volume_drop' | 'model_failure' | 'quality_degradation' | 'coverage_gap';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPeriod: { start: Date; end: Date };
  metrics: any;
  classification: 'system_failure' | 'memory_decay' | 'mixed' | 'unknown';
}

interface WeeklyStats {
  week: Date;
  responseCount: number;
  activeModels: number;
  uniqueDomains: number;
  avgResponseLength: number;
  completionRate: number;
}

class TensorAnomalyDetector {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async detectAnomalies(): Promise<AnomalyResult> {
    logger.info('🔍 Starting tensor anomaly detection');
    
    const anomalies: Anomaly[] = [];
    const recommendations: string[] = [];
    
    try {
      // 1. Analyze weekly trends
      const weeklyStats = await this.getWeeklyStats();
      const volumeAnomalies = await this.detectVolumeAnomalies(weeklyStats);
      anomalies.push(...volumeAnomalies);
      
      // 2. Detect model failures
      const modelAnomalies = await this.detectModelFailures();
      anomalies.push(...modelAnomalies);
      
      // 3. Analyze response quality degradation
      const qualityAnomalies = await this.detectQualityDegradation();
      anomalies.push(...qualityAnomalies);
      
      // 4. Check coverage gaps
      const coverageAnomalies = await this.detectCoverageGaps();
      anomalies.push(...coverageAnomalies);
      
      // 5. Classify overall system health
      const systemHealth = this.classifySystemHealth(anomalies);
      
      // 6. Generate recommendations
      const recs = this.generateRecommendations(anomalies, systemHealth);
      recommendations.push(...recs);
      
      logger.info(`🎯 Anomaly detection completed: ${anomalies.length} anomalies detected`, {
        systemHealth,
        anomalyCount: anomalies.length
      });
      
      return {
        detected: anomalies.length > 0,
        anomalies,
        systemHealth,
        recommendations
      };
      
    } catch (error) {
      logger.error('💥 Anomaly detection failed', { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  private async getWeeklyStats(): Promise<WeeklyStats[]> {
    const result = await this.pool.query(`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as response_count,
        COUNT(DISTINCT model) as active_models,
        COUNT(DISTINCT domain_id) as unique_domains,
        ROUND(AVG(LENGTH(response)), 0) as avg_response_length
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week DESC
    `);
    
    return result.rows.map(row => ({
      week: new Date(row.week),
      responseCount: parseInt(row.response_count),
      activeModels: parseInt(row.active_models),
      uniqueDomains: parseInt(row.unique_domains),
      avgResponseLength: parseInt(row.avg_response_length),
      completionRate: 0 // Will calculate separately if needed
    }));
  }

  private async detectVolumeAnomalies(weeklyStats: WeeklyStats[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (weeklyStats.length < 2) return anomalies;
    
    // Calculate z-scores for response volume
    const responseCounts = weeklyStats.map(s => s.responseCount);
    const mean = responseCounts.reduce((a, b) => a + b, 0) / responseCounts.length;
    const stdDev = Math.sqrt(responseCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / responseCounts.length);
    
    for (let i = 0; i < weeklyStats.length; i++) {
      const stat = weeklyStats[i];
      const zScore = (stat.responseCount - mean) / stdDev;
      
      if (Math.abs(zScore) > 2.5) { // Significant deviation
        const severity = Math.abs(zScore) > 3.5 ? 'critical' : 'high';
        const isDropout = zScore < -2.5;
        
        anomalies.push({
          type: 'volume_drop',
          severity,
          description: `${isDropout ? 'Severe drop' : 'Unusual spike'} in response volume: ${stat.responseCount} responses (z-score: ${zScore.toFixed(2)})`,
          affectedPeriod: {
            start: stat.week,
            end: new Date(stat.week.getTime() + 7 * 24 * 60 * 60 * 1000)
          },
          metrics: { responseCount: stat.responseCount, zScore, mean, stdDev },
          classification: isDropout && Math.abs(zScore) > 3 ? 'system_failure' : 'unknown'
        });
      }
    }
    
    return anomalies;
  }

  private async detectModelFailures(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for sudden model disappearances
    const modelActivity = await this.pool.query(`
      SELECT 
        model,
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as daily_responses
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY model, DATE_TRUNC('day', created_at)
      ORDER BY model, day DESC
    `);
    
    // Group by model
    const modelMap = new Map<string, Array<{day: Date, responses: number}>>();
    for (const row of modelActivity.rows) {
      const model = row.model;
      if (!modelMap.has(model)) {
        modelMap.set(model, []);
      }
      modelMap.get(model)!.push({
        day: new Date(row.day),
        responses: parseInt(row.daily_responses)
      });
    }
    
    // Detect sudden stops
    for (const [model, activity] of modelMap.entries()) {
      if (activity.length < 3) continue; // Need at least 3 days of data
      
      const recentActivity = activity.slice(0, 3); // Last 3 days
      const hasRecentActivity = recentActivity.some(a => a.responses > 0);
      
      if (!hasRecentActivity) {
        const lastActiveDay = activity.find(a => a.responses > 0);
        if (lastActiveDay) {
          anomalies.push({
            type: 'model_failure',
            severity: 'high',
            description: `Model ${model} stopped responding (last active: ${lastActiveDay.day.toDateString()})`,
            affectedPeriod: {
              start: lastActiveDay.day,
              end: new Date()
            },
            metrics: { model, lastActiveDay: lastActiveDay.day },
            classification: 'system_failure'
          });
        }
      }
    }
    
    return anomalies;
  }

  private async detectQualityDegradation(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for sudden drops in response quality
    const qualityTrend = await this.pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        ROUND(AVG(LENGTH(response)), 0) as avg_length,
        COUNT(CASE WHEN LENGTH(response) < 100 THEN 1 END) as short_responses,
        COUNT(*) as total_responses
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `);
    
    for (let i = 0; i < qualityTrend.rows.length - 1; i++) {
      const current = qualityTrend.rows[i];
      const previous = qualityTrend.rows[i + 1];
      
      const currentAvg = parseInt(current.avg_length);
      const previousAvg = parseInt(previous.avg_length);
      
      if (previousAvg > 0) {
        const change = ((currentAvg - previousAvg) / previousAvg) * 100;
        
        if (change < -30) { // 30% drop in average length
          anomalies.push({
            type: 'quality_degradation',
            severity: change < -50 ? 'critical' : 'high',
            description: `Significant drop in response quality: ${change.toFixed(1)}% decrease in average length`,
            affectedPeriod: {
              start: new Date(current.day),
              end: new Date(current.day)
            },
            metrics: { currentAvg, previousAvg, change },
            classification: change < -50 ? 'system_failure' : 'memory_decay'
          });
        }
      }
    }
    
    return anomalies;
  }

  private async detectCoverageGaps(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for domains that haven't been processed recently
    const coverageGaps = await this.pool.query(`
      SELECT 
        d.domain,
        MAX(dr.created_at) as last_processed,
        EXTRACT(DAYS FROM (NOW() - MAX(dr.created_at))) as days_since_last
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
      GROUP BY d.domain
      HAVING MAX(dr.created_at) < NOW() - INTERVAL '7 days' OR MAX(dr.created_at) IS NULL
      ORDER BY days_since_last DESC NULLS FIRST
      LIMIT 100
    `);
    
    if (coverageGaps.rows.length > 100) { // Threshold for concern
      anomalies.push({
        type: 'coverage_gap',
        severity: 'medium',
        description: `${coverageGaps.rows.length} domains haven't been processed in over 7 days`,
        affectedPeriod: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        metrics: { gapCount: coverageGaps.rows.length },
        classification: 'system_failure'
      });
    }
    
    return anomalies;
  }

  private classifySystemHealth(anomalies: Anomaly[]): 'healthy' | 'degraded' | 'critical' {
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'critical';
    if (highCount > 0 || anomalies.length > 3) return 'degraded';
    return 'healthy';
  }

  private generateRecommendations(anomalies: Anomaly[], systemHealth: string): string[] {
    const recommendations: string[] = [];
    
    if (systemHealth === 'critical') {
      recommendations.push('IMMEDIATE ACTION REQUIRED: System is in critical state');
      recommendations.push('Stop all non-essential processing until issues are resolved');
    }
    
    const systemFailures = anomalies.filter(a => a.classification === 'system_failure');
    if (systemFailures.length > 0) {
      recommendations.push('Infrastructure failures detected - check AI provider connections');
      recommendations.push('Validate API keys and rate limits for all providers');
    }
    
    const modelFailures = anomalies.filter(a => a.type === 'model_failure');
    if (modelFailures.length > 0) {
      recommendations.push(`${modelFailures.length} AI models have stopped responding - investigate provider status`);
    }
    
    const volumeDrops = anomalies.filter(a => a.type === 'volume_drop' && a.classification === 'system_failure');
    if (volumeDrops.length > 0) {
      recommendations.push('Severe volume drops detected - likely infrastructure failure rather than memory decay');
      recommendations.push('Flag affected time periods as unreliable for temporal analysis');
    }
    
    if (systemHealth === 'healthy' && anomalies.length === 0) {
      recommendations.push('System is healthy - data is reliable for temporal decay analysis');
    }
    
    return recommendations;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI execution
async function main() {
  const detector = new TensorAnomalyDetector();
  
  try {
    const result = await detector.detectAnomalies();
    
    console.log('\n🚨 TENSOR ANOMALY DETECTION REPORT');
    console.log('==================================');
    console.log(`System Health: ${result.systemHealth.toUpperCase()}`);
    console.log(`Anomalies Detected: ${result.anomalies.length}`);
    
    if (result.anomalies.length > 0) {
      console.log('\nANOMALIES:');
      for (const anomaly of result.anomalies) {
        console.log(`- ${anomaly.severity.toUpperCase()}: ${anomaly.description}`);
        console.log(`  Classification: ${anomaly.classification}`);
        console.log(`  Period: ${anomaly.affectedPeriod.start.toDateString()} - ${anomaly.affectedPeriod.end.toDateString()}`);
      }
    }
    
    if (result.recommendations.length > 0) {
      console.log('\nRECOMMENDATIONS:');
      for (const rec of result.recommendations) {
        console.log(`- ${rec}`);
      }
    }
    
    process.exit(result.systemHealth === 'critical' ? 1 : 0);
    
  } catch (error) {
    logger.error('💥 Anomaly detection crashed', { error: (error instanceof Error ? error.message : String(error)) });
    process.exit(1);
  } finally {
    await detector.close();
  }
}

if (require.main === module) {
  main();
}

export { TensorAnomalyDetector, AnomalyResult, Anomaly }; 