/**
 * 📊 SYNCHRONIZATION MONITORING DASHBOARD
 * Real-time monitoring and alerting for LLM synchronization health
 */

import { Pool } from 'pg';
import winston from 'winston';
import { LLMSynchronizationFailsafe, FAILSAFE_CONFIG } from './llm-synchronization-failsafes';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Monitoring thresholds
const MONITORING_THRESHOLDS = {
  CRITICAL_SUCCESS_RATE: 0.6,        // Below 60% success rate is critical
  WARNING_SUCCESS_RATE: 0.8,         // Below 80% success rate is warning
  CRITICAL_TEMPORAL_VARIANCE: 600000, // 10 minutes
  WARNING_TEMPORAL_VARIANCE: 300000,  // 5 minutes
  CRITICAL_RESPONSE_TIME: 120000,     // 2 minutes
  WARNING_RESPONSE_TIME: 60000,       // 1 minute
  UNHEALTHY_PROVIDER_THRESHOLD: 3,    // 3+ unhealthy providers is critical
  CIRCUIT_BREAKER_ALERT_THRESHOLD: 2  // 2+ circuit breakers open is warning
} as const;

// Dashboard data structures
interface SynchronizationMetrics {
  totalBatches: number;
  successfulBatches: number;
  partialBatches: number;
  failedBatches: number;
  avgSuccessRate: number;
  avgTemporalVariance: number;
  avgResponseTime: number;
  recentAlerts: Alert[];
}

interface ProviderMetrics {
  totalProviders: number;
  healthyProviders: number;
  unhealthyProviders: number;
  circuitBreakersOpen: number;
  avgFailureRate: number;
  slowestProvider: string;
  fastestProvider: string;
}

interface Alert {
  id: number;
  level: string;
  message: string;
  createdAt: Date;
  resolved: boolean;
  batchId?: string;
  providerName?: string;
}

interface DashboardData {
  timestamp: Date;
  synchronizationMetrics: SynchronizationMetrics;
  providerMetrics: ProviderMetrics;
  activeIncidents: Alert[];
  healthScore: number;
  recommendations: string[];
}

export class SynchronizationMonitor {
  private pool: Pool;
  private failsafe: LLMSynchronizationFailsafe;
  private monitoringInterval?: NodeJS.Timeout;
  private webhookUrls: string[] = [];

  constructor(pool: Pool, failsafe: LLMSynchronizationFailsafe) {
    this.pool = pool;
    this.failsafe = failsafe;
    
    // Register alert callback with failsafe system
    this.failsafe.addAlertCallback((level, message, data) => {
      this.handleAlert(level, message, data);
    });
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCheck();
      } catch (error) {
        logger.error('Monitoring check failed:', error);
      }
    }, intervalMs);

    logger.info(`📊 Started synchronization monitoring (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    logger.info('📊 Stopped synchronization monitoring');
  }

  /**
   * Get current dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const [syncMetrics, providerMetrics, activeIncidents] = await Promise.all([
      this.getSynchronizationMetrics(),
      this.getProviderMetrics(),
      this.getActiveIncidents()
    ]);

    const healthScore = this.calculateHealthScore(syncMetrics, providerMetrics);
    const recommendations = this.generateRecommendations(syncMetrics, providerMetrics, activeIncidents);

    return {
      timestamp: new Date(),
      synchronizationMetrics: syncMetrics,
      providerMetrics: providerMetrics,
      activeIncidents,
      healthScore,
      recommendations
    };
  }

  /**
   * Get synchronization metrics from database
   */
  private async getSynchronizationMetrics(): Promise<SynchronizationMetrics> {
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_batches,
        COUNT(*) FILTER (WHERE synchronization_status = 'synchronized') as successful_batches,
        COUNT(*) FILTER (WHERE synchronization_status = 'partial') as partial_batches,
        COUNT(*) FILTER (WHERE synchronization_status = 'failed') as failed_batches,
        AVG(success_rate) as avg_success_rate,
        AVG(temporal_variance_ms) as avg_temporal_variance,
        AVG(avg_response_time_ms) as avg_response_time
      FROM domain_processing_quality 
      WHERE processing_timestamp > NOW() - INTERVAL '24 hours'
    `;

    const alertsQuery = `
      SELECT id, alert_level, message, created_at, resolved, batch_id, provider_name
      FROM synchronization_alerts 
      WHERE created_at > NOW() - INTERVAL '6 hours'
      ORDER BY created_at DESC 
      LIMIT 50
    `;

    const [metricsResult, alertsResult] = await Promise.all([
      this.pool.query(metricsQuery),
      this.pool.query(alertsQuery)
    ]);

    const metrics = metricsResult.rows[0];
    const alerts = alertsResult.rows.map(row => ({
      id: row.id,
      level: row.alert_level,
      message: row.message,
      createdAt: row.created_at,
      resolved: row.resolved,
      batchId: row.batch_id,
      providerName: row.provider_name
    }));

    return {
      totalBatches: parseInt(metrics.total_batches) || 0,
      successfulBatches: parseInt(metrics.successful_batches) || 0,
      partialBatches: parseInt(metrics.partial_batches) || 0,
      failedBatches: parseInt(metrics.failed_batches) || 0,
      avgSuccessRate: parseFloat(metrics.avg_success_rate) || 0,
      avgTemporalVariance: parseInt(metrics.avg_temporal_variance) || 0,
      avgResponseTime: parseInt(metrics.avg_response_time) || 0,
      recentAlerts: alerts
    };
  }

  /**
   * Get provider health metrics
   */
  private async getProviderMetrics(): Promise<ProviderMetrics> {
    const providerQuery = `
      SELECT 
        COUNT(*) as total_providers,
        COUNT(*) FILTER (WHERE is_healthy = true) as healthy_providers,
        COUNT(*) FILTER (WHERE is_healthy = false) as unhealthy_providers,
        COUNT(*) FILTER (WHERE circuit_breaker_open = true) as circuit_breakers_open,
        AVG(CASE WHEN total_calls > 0 THEN (total_failures::DECIMAL / total_calls) ELSE 0 END) as avg_failure_rate,
        provider_name || '/' || model_name as provider_model,
        avg_response_time_ms
      FROM llm_provider_health
      ORDER BY avg_response_time_ms DESC
    `;

    const result = await this.pool.query(providerQuery);
    
    if (result.rows.length === 0) {
      return {
        totalProviders: 0,
        healthyProviders: 0,
        unhealthyProviders: 0,
        circuitBreakersOpen: 0,
        avgFailureRate: 0,
        slowestProvider: 'N/A',
        fastestProvider: 'N/A'
      };
    }

    const summary = result.rows[0];
    const sortedProviders = result.rows.sort((a, b) => a.avg_response_time_ms - b.avg_response_time_ms);

    return {
      totalProviders: parseInt(summary.total_providers) || 0,
      healthyProviders: parseInt(summary.healthy_providers) || 0,
      unhealthyProviders: parseInt(summary.unhealthy_providers) || 0,
      circuitBreakersOpen: parseInt(summary.circuit_breakers_open) || 0,
      avgFailureRate: parseFloat(summary.avg_failure_rate) || 0,
      slowestProvider: sortedProviders[sortedProviders.length - 1]?.provider_model || 'N/A',
      fastestProvider: sortedProviders[0]?.provider_model || 'N/A'
    };
  }

  /**
   * Get active incidents
   */
  private async getActiveIncidents(): Promise<Alert[]> {
    const incidentsQuery = `
      SELECT id, alert_level, message, created_at, resolved, batch_id, provider_name
      FROM synchronization_alerts 
      WHERE resolved = false 
      AND alert_level IN ('critical', 'emergency')
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(incidentsQuery);

    return result.rows.map(row => ({
      id: row.id,
      level: row.alert_level,
      message: row.message,
      createdAt: row.created_at,
      resolved: row.resolved,
      batchId: row.batch_id,
      providerName: row.provider_name
    }));
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    syncMetrics: SynchronizationMetrics,
    providerMetrics: ProviderMetrics
  ): number {
    let score = 100;

    // Deduct points for synchronization issues
    if (syncMetrics.avgSuccessRate < MONITORING_THRESHOLDS.CRITICAL_SUCCESS_RATE) {
      score -= 40;
    } else if (syncMetrics.avgSuccessRate < MONITORING_THRESHOLDS.WARNING_SUCCESS_RATE) {
      score -= 20;
    }

    // Deduct points for temporal variance
    if (syncMetrics.avgTemporalVariance > MONITORING_THRESHOLDS.CRITICAL_TEMPORAL_VARIANCE) {
      score -= 20;
    } else if (syncMetrics.avgTemporalVariance > MONITORING_THRESHOLDS.WARNING_TEMPORAL_VARIANCE) {
      score -= 10;
    }

    // Deduct points for slow response times
    if (syncMetrics.avgResponseTime > MONITORING_THRESHOLDS.CRITICAL_RESPONSE_TIME) {
      score -= 15;
    } else if (syncMetrics.avgResponseTime > MONITORING_THRESHOLDS.WARNING_RESPONSE_TIME) {
      score -= 7;
    }

    // Deduct points for unhealthy providers
    if (providerMetrics.unhealthyProviders >= MONITORING_THRESHOLDS.UNHEALTHY_PROVIDER_THRESHOLD) {
      score -= 15;
    }

    // Deduct points for circuit breakers
    if (providerMetrics.circuitBreakersOpen >= MONITORING_THRESHOLDS.CIRCUIT_BREAKER_ALERT_THRESHOLD) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    syncMetrics: SynchronizationMetrics,
    providerMetrics: ProviderMetrics,
    activeIncidents: Alert[]
  ): string[] {
    const recommendations: string[] = [];

    // Synchronization recommendations
    if (syncMetrics.avgSuccessRate < MONITORING_THRESHOLDS.WARNING_SUCCESS_RATE) {
      recommendations.push(`🔧 Success rate is ${(syncMetrics.avgSuccessRate * 100).toFixed(1)}%. Consider scaling up infrastructure or adjusting timeout settings.`);
    }

    if (syncMetrics.avgTemporalVariance > MONITORING_THRESHOLDS.WARNING_TEMPORAL_VARIANCE) {
      recommendations.push(`⏱️ High temporal variance detected (${(syncMetrics.avgTemporalVariance / 1000).toFixed(1)}s). Consider optimizing slower providers or implementing pre-warming.`);
    }

    if (syncMetrics.avgResponseTime > MONITORING_THRESHOLDS.WARNING_RESPONSE_TIME) {
      recommendations.push(`🚀 Average response time is ${(syncMetrics.avgResponseTime / 1000).toFixed(1)}s. Consider optimizing API calls or using faster models.`);
    }

    // Provider recommendations
    if (providerMetrics.unhealthyProviders > 0) {
      recommendations.push(`🩺 ${providerMetrics.unhealthyProviders} providers are unhealthy. Check API keys and provider status.`);
    }

    if (providerMetrics.circuitBreakersOpen > 0) {
      recommendations.push(`⚡ ${providerMetrics.circuitBreakersOpen} circuit breakers are open. Monitor provider recovery and consider temporary load redistribution.`);
    }

    if (providerMetrics.avgFailureRate > 0.1) {
      recommendations.push(`📊 Average failure rate is ${(providerMetrics.avgFailureRate * 100).toFixed(1)}%. Review provider reliability and implement additional retry logic.`);
    }

    // Incident-based recommendations
    if (activeIncidents.length > 5) {
      recommendations.push(`🚨 ${activeIncidents.length} active critical incidents. Prioritize incident resolution and consider emergency scaling.`);
    }

    // Default recommendation if everything looks good
    if (recommendations.length === 0) {
      recommendations.push(`✅ System health is optimal. Continue monitoring for sustained performance.`);
    }

    return recommendations;
  }

  /**
   * Perform comprehensive monitoring check
   */
  private async performMonitoringCheck(): Promise<void> {
    const dashboardData = await this.getDashboardData();
    
    // Check for critical conditions and create alerts
    await this.checkCriticalConditions(dashboardData);
    
    // Log health summary
    logger.info(`📊 Health Check - Score: ${dashboardData.healthScore}/100, Active Incidents: ${dashboardData.activeIncidents.length}`);
    
    // Send webhook notifications if configured
    if (dashboardData.healthScore < 70 || dashboardData.activeIncidents.length > 0) {
      await this.sendWebhookNotifications(dashboardData);
    }
  }

  /**
   * Check for critical conditions and create alerts
   */
  private async checkCriticalConditions(dashboardData: DashboardData): Promise<void> {
    const { synchronizationMetrics, providerMetrics } = dashboardData;

    // Check success rate
    if (synchronizationMetrics.avgSuccessRate < MONITORING_THRESHOLDS.CRITICAL_SUCCESS_RATE) {
      await this.createAlert('critical', 
        `Critical: Success rate dropped to ${(synchronizationMetrics.avgSuccessRate * 100).toFixed(1)}%`,
        { successRate: synchronizationMetrics.avgSuccessRate }
      );
    }

    // Check temporal variance
    if (synchronizationMetrics.avgTemporalVariance > MONITORING_THRESHOLDS.CRITICAL_TEMPORAL_VARIANCE) {
      await this.createAlert('warning',
        `High temporal variance: ${(synchronizationMetrics.avgTemporalVariance / 1000).toFixed(1)}s`,
        { temporalVariance: synchronizationMetrics.avgTemporalVariance }
      );
    }

    // Check provider health
    if (providerMetrics.unhealthyProviders >= MONITORING_THRESHOLDS.UNHEALTHY_PROVIDER_THRESHOLD) {
      await this.createAlert('critical',
        `${providerMetrics.unhealthyProviders} providers are unhealthy`,
        { unhealthyCount: providerMetrics.unhealthyProviders }
      );
    }

    // Check overall health score
    if (dashboardData.healthScore < 50) {
      await this.createAlert('emergency',
        `System health critical: ${dashboardData.healthScore}/100`,
        { healthScore: dashboardData.healthScore }
      );
    }
  }

  /**
   * Create alert in database
   */
  private async createAlert(level: string, message: string, data?: any): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO synchronization_alerts (alert_level, message, alert_data, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [level, message, JSON.stringify(data)]);
      
      logger.warn(`🚨 Alert created: [${level.toUpperCase()}] ${message}`);
    } catch (error) {
      logger.error('Failed to create alert:', error);
    }
  }

  /**
   * Handle alert from failsafe system
   */
  private async handleAlert(level: string, message: string, data?: any): Promise<void> {
    await this.createAlert(level, message, data);
    
    // Send immediate notification for critical alerts
    if (level === 'critical' || level === 'emergency') {
      await this.sendImmediateNotification(level, message, data);
    }
  }

  /**
   * Add webhook URL for notifications
   */
  addWebhookUrl(url: string): void {
    this.webhookUrls.push(url);
    logger.info(`📡 Added webhook URL: ${url}`);
  }

  /**
   * Send webhook notifications
   */
  private async sendWebhookNotifications(dashboardData: DashboardData): Promise<void> {
    if (this.webhookUrls.length === 0) return;

    const payload = {
      timestamp: dashboardData.timestamp,
      healthScore: dashboardData.healthScore,
      activeIncidents: dashboardData.activeIncidents.length,
      recommendations: dashboardData.recommendations,
      details: {
        successRate: dashboardData.synchronizationMetrics.avgSuccessRate,
        unhealthyProviders: dashboardData.providerMetrics.unhealthyProviders,
        circuitBreakersOpen: dashboardData.providerMetrics.circuitBreakersOpen
      }
    };

    const webhookPromises = this.webhookUrls.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }
      } catch (error) {
        logger.error(`Webhook notification failed for ${url}:`, error);
      }
    });

    await Promise.allSettled(webhookPromises);
  }

  /**
   * Send immediate notification for critical alerts
   */
  private async sendImmediateNotification(level: string, message: string, data?: any): Promise<void> {
    const payload = {
      alert: 'IMMEDIATE',
      level: level.toUpperCase(),
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Send to all configured webhooks immediately
    const webhookPromises = this.webhookUrls.map(async (url) => {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        logger.error(`Immediate notification failed for ${url}:`, error);
      }
    });

    await Promise.allSettled(webhookPromises);
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<{
    uptime: number;
    totalAlertsGenerated: number;
    criticalAlertsResolved: number;
    avgHealthScore: number;
    lastMonitoringCheck: Date;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE resolved = true AND alert_level = 'critical') as critical_resolved,
        AVG(
          CASE 
            WHEN alert_data->>'healthScore' IS NOT NULL 
            THEN (alert_data->>'healthScore')::INTEGER 
          END
        ) as avg_health_score
      FROM synchronization_alerts
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.pool.query(statsQuery);
    const stats = result.rows[0];

    return {
      uptime: this.monitoringInterval ? Date.now() : 0,
      totalAlertsGenerated: parseInt(stats.total_alerts) || 0,
      criticalAlertsResolved: parseInt(stats.critical_resolved) || 0,
      avgHealthScore: parseFloat(stats.avg_health_score) || 100,
      lastMonitoringCheck: new Date()
    };
  }
}